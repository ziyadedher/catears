//! Catears
//!
//! ## Pinout
//!
//! XIAO-ESP32-S3 pinout diagram can be found at <https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/img/2.jpg>.

#![no_std]
#![no_main]
#![deny(unsafe_code)]
#![warn(
    clippy::pedantic,
    clippy::unwrap_used,
    clippy::panic,
    clippy::todo,
    clippy::unimplemented,
    clippy::unreachable
)]
#![deny(
    clippy::mem_forget,
    reason = "mem::forget is generally not safe to do with esp_hal types, especially those holding buffers for the \
    duration of a data transfer."
)]

use defmt::{debug, info, warn};
use embassy_executor::Spawner;
use embassy_net::{
    dns::DnsSocket,
    tcp::client::{TcpClient, TcpClientState},
    Stack,
};
use embassy_sync::{blocking_mutex::raw::CriticalSectionRawMutex, rwlock::RwLock};
use embassy_time::{Timer, WithTimeout as _};
use embedded_io_async::Write as _;
use esp_hal::{
    clock::CpuClock,
    dma_buffers,
    gpio::{Level, Output, OutputConfig},
    i2s::master::{I2s, I2sTx},
    mcpwm::{operator::PwmPinConfig, timer::PwmWorkingMode, McPwm, PeripheralClockConfig},
    rmt::{self, Rmt},
    time::Rate,
    usb_serial_jtag::UsbSerialJtag,
};
use esp_hal_smartled::SmartLedsAdapterAsync;
use panic_rtt_target as _;
use reqwless::client::{HttpClient, TlsConfig, TlsVerify};
use smart_leds::hsv::{hsv2rgb, Hsv};
use smart_leds::SmartLedsWriteAsync;
use static_cell::StaticCell;

// This creates a default app-descriptor required by the esp-idf bootloader.
// For more information see <https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/app_image_format.html#application-description>.
esp_bootloader_esp_idf::esp_app_desc!();

static STATE: RwLock<CriticalSectionRawMutex, catears::state::State> =
    RwLock::new(catears::state::State::default_const());

#[esp_hal_embassy::main]
async fn main(spawner: Spawner) -> ! {
    {
        rtt_target::rtt_init_defmt!();
        info!("Logging initialized!");
    }

    let mut peripherals = {
        let config = esp_hal::Config::default().with_cpu_clock(CpuClock::max());
        let peripherals = esp_hal::init(config);
        info!("Peripherals and HAL initialized!");
        peripherals
    };

    let system_timer = esp_hal::timer::systimer::SystemTimer::new(peripherals.SYSTIMER);
    let rng = esp_hal::rng::Rng::new(peripherals.RNG.reborrow());

    {
        esp_hal_embassy::init(system_timer.alarm0);
        info!("Embassy initialized!");
    }

    {
        // esp_alloc::heap_allocator!(size: 64 * 1024);
        // COEX needs more RAM - so we've added some more
        esp_alloc::heap_allocator!(#[link_section = ".dram2_uninit"] size: 64 * 1024);
        info!("Heap allocator initialized!");
    }

    let networking_stack = {
        let stack = catears::networking::init(
            catears::networking::Config {
                client: esp_wifi::wifi::ClientConfiguration {
                    ssid: env!("WIFI_SSID").into(),
                    password: env!("WIFI_PASSWORD").into(),
                    ..Default::default()
                },
                dhcp_hostname: "catears".try_into().expect("hostname too long"),
            },
            system_timer.alarm1,
            rng,
            peripherals.WIFI,
            &spawner,
        )
        .await
        .expect("Failed to initialize networking stack");
        info!("Networking stack initialized!");
        stack
    };

    let serial = {
        let init_result = embassy_time::with_timeout(embassy_time::Duration::from_secs(1), async {
            let mut serial = UsbSerialJtag::new(peripherals.USB_DEVICE).into_async();
            serial
                .write_all(b"JTAG serial interface initialized!\r\n")
                .await
                .expect("Failed to write to serial");
            serial.flush().await.expect("Failed to flush serial");
            serial
        })
        .await;
        if let Ok(result) = init_result {
            info!("JTAG serial interface initialized!");
            Some(result)
        } else {
            info!("JTAG serial interface initialization timed out");
            None
        }
    };

    if let Some(serial) = serial {
        catears::cmdline::init(&STATE, serial, &spawner).await;
        info!("Command line interface initialized!");
    } else {
        warn!(
            "JTAG serial interface not available, command line interface will not be initialized"
        );
    }

    let (led_ring_left, led_ring_right) = {
        let rmt = Rmt::new(peripherals.RMT, Rate::from_mhz(80))
            .expect("Failed to initialize RMT")
            .into_async();
        let led_ring_left = SmartLedsAdapterAsync::new(
            rmt.channel1,
            Output::new(peripherals.GPIO43, Level::Low, OutputConfig::default()),
            [0u32; esp_hal_smartled::buffer_size_async(12)],
        );
        let led_ring_right = SmartLedsAdapterAsync::new(
            rmt.channel2,
            Output::new(peripherals.GPIO1, Level::Low, OutputConfig::default()),
            [0u32; esp_hal_smartled::buffer_size_async(12)],
        );
        info!("LEDs initialized!");
        (led_ring_left, led_ring_right)
    };

    let (servo_left, servo_right) = {
        let clock_cfg = PeripheralClockConfig::with_frequency(Rate::from_mhz(1))
            .expect("Failed to configure peripheral clock");
        let mut mcpwm = McPwm::new(peripherals.MCPWM0, clock_cfg);
        mcpwm.operator0.set_timer(&mcpwm.timer0);
        mcpwm.operator1.set_timer(&mcpwm.timer0);
        let timer_clock_cfg = clock_cfg
            .timer_clock_with_frequency(19_999, PwmWorkingMode::Increase, Rate::from_hz(50))
            .expect("Failed to configure timer clock");
        mcpwm.timer0.start(timer_clock_cfg);
        let (pin_a, pin_b) = mcpwm.operator0.with_pins(
            Output::new(peripherals.GPIO44, Level::Low, OutputConfig::default()),
            PwmPinConfig::UP_ACTIVE_HIGH,
            Output::new(peripherals.GPIO2, Level::Low, OutputConfig::default()),
            PwmPinConfig::UP_ACTIVE_HIGH,
        );
        let servo_left = catears::servo::Servo::new(pin_a, catears::servo::Config::MGG995);
        let servo_right = catears::servo::Servo::new(pin_b, catears::servo::Config::MGG995);
        info!("Servos initialized!");
        (servo_left, servo_right)
    };

    let (i2s_tx_left, i2s_tx_right) = {
        #[allow(clippy::manual_div_ceil)]
        let (_, _, _, tx_descriptors_left) = dma_buffers!(0, 16 * 4096);
        let i2s_tx_left = I2s::new(
            peripherals.I2S0,
            esp_hal::i2s::master::Standard::Philips,
            esp_hal::i2s::master::DataFormat::Data16Channel16,
            Rate::from_hz(44100),
            peripherals.DMA_CH0,
        )
        .into_async()
        .i2s_tx
        .with_ws(peripherals.GPIO9) // Green
        .with_bclk(peripherals.GPIO8) // White
        .with_dout(peripherals.GPIO7) // Blue
        .build(tx_descriptors_left);

        #[allow(clippy::manual_div_ceil)]
        let (_, _, _, tx_descriptors_right) = dma_buffers!(0, 16 * 4096);
        let i2s_tx_right = I2s::new(
            peripherals.I2S1,
            esp_hal::i2s::master::Standard::Philips,
            esp_hal::i2s::master::DataFormat::Data16Channel16,
            Rate::from_hz(44100),
            peripherals.DMA_CH1,
        )
        .into_async()
        .i2s_tx
        .with_ws(peripherals.GPIO3) // Green
        .with_bclk(peripherals.GPIO4) // White
        .with_dout(peripherals.GPIO5) // Blue
        .build(tx_descriptors_right);

        info!("I2S initialized!");
        (i2s_tx_left, i2s_tx_right)
    };

    spawner
        .spawn(update_state(
            networking_stack,
            esp_hal::rng::Trng::new(peripherals.RNG.reborrow(), peripherals.ADC1),
            &STATE,
        ))
        .expect("Failed to spawn update state task");

    spawner
        .spawn(control_leds(&STATE, led_ring_left, led_ring_right))
        .expect("Failed to spawn rainbow LED task");
    spawner
        .spawn(control_servos(&STATE, servo_left, servo_right))
        .expect("Failed to spawn servo control task");
    spawner
        .spawn(control_speakers(&STATE, i2s_tx_left, i2s_tx_right))
        .expect("Failed to spawn speaker control task");

    loop {
        Timer::after(embassy_time::Duration::from_millis(50)).await;
    }
}

static TCP_CLIENT_STATE: StaticCell<TcpClientState<8, 4096, 4096>> = StaticCell::new();
static TLS_READ_BUFFER: StaticCell<[u8; 4 * 8192]> = StaticCell::new();
static TLS_WRITE_BUFFER: StaticCell<[u8; 2 * 8192]> = StaticCell::new();
static RESPONSE_BUFFER: StaticCell<[u8; 8192]> = StaticCell::new();

#[embassy_executor::task]
async fn update_state(
    stack: Stack<'static>,
    mut rng: esp_hal::rng::Trng<'static>,
    state: &'static RwLock<CriticalSectionRawMutex, catears::state::State>,
) {
    let tcp_client_state = TCP_CLIENT_STATE.init(TcpClientState::new());
    let tcp_client = TcpClient::new(stack, tcp_client_state);

    #[allow(clippy::large_stack_arrays)]
    let read_buffer = TLS_READ_BUFFER.init([0u8; 4 * 8192]);
    let write_buffer = TLS_WRITE_BUFFER.init([0u8; 2 * 8192]);
    let response_buffer = RESPONSE_BUFFER.init([0u8; 8192]);
    let tls_config = TlsConfig::new(
        // Note that this is bad randomness since we're casting the u32 to a u64, but we don't really care.
        u64::from(rng.random()),
        read_buffer,
        write_buffer,
        TlsVerify::None,
    );

    let dns_socket = DnsSocket::new(stack);
    let mut http_client = HttpClient::new_with_tls(&tcp_client, &dns_socket, tls_config);

    loop {
        let mut request = http_client
            .request(
                reqwless::request::Method::GET,
                "https://storage.googleapis.com/ziyadedher/catears.json",
            )
            .await
            .expect("Failed to create HTTP request");

        let response = request
            .send(response_buffer)
            .with_timeout(embassy_time::Duration::from_secs(1))
            .await
            .expect("Timed out waiting for HTTP response")
            .expect("Failed to send HTTP request or recieve response");
        debug!("HTTP response status: {}", response.status);
        let response_body = response
            .body()
            .read_to_end()
            .await
            .expect("Failed to read HTTP response body");
        let response_body_str =
            core::str::from_utf8(response_body).unwrap_or("Invalid UTF-8 response");
        debug!("HTTP response body: {}", response_body_str);

        match serde_json_core::from_str::<catears::state::State>(response_body_str) {
            Ok((new_state, _)) => {
                debug!("Successfully parsed state from JSON");
                state.write().await.clone_from(&new_state);
                debug!("State updated from remote");
            }
            Err(_e) => {
                warn!("Failed to parse JSON state");
            }
        }

        Timer::after(embassy_time::Duration::from_millis(100)).await;
    }
}

static AUDIO_BUFFER: StaticCell<[i16; 8192]> = StaticCell::new();

#[allow(clippy::too_many_lines)]
#[embassy_executor::task]
async fn control_speakers(
    state: &'static RwLock<CriticalSectionRawMutex, catears::state::State>,
    mut left: I2sTx<'static, esp_hal::Async>,
    mut right: I2sTx<'static, esp_hal::Async>,
) -> ! {
    let audio_buffer = AUDIO_BUFFER.init([0i16; 8192]);

    info!("Speaker control task started");

    loop {
        let speaker_state = state.read().await.speakers;

        match speaker_state.mode {
            catears::audio::Mode::Silent => {
                debug!("Playing silence");
                // Send silence
                audio_buffer.fill(0);
                let audio_bytes: &mut [u8] = bytemuck::cast_slice_mut(&mut audio_buffer[..]);
                let _ = left.write_dma_async(audio_bytes).await;
                let _ = right.write_dma_async(audio_bytes).await;
                Timer::after(embassy_time::Duration::from_millis(100)).await;
            }
            catears::audio::Mode::Tone(note) => {
                let volume = note.volume.unwrap_or(speaker_state.volume);
                #[allow(clippy::cast_precision_loss)]
                let amplitude = (32767.0 * f32::from(volume) / 255.0) * 0.5;
                debug!(
                    "Playing tone: frequency={}Hz, duration={}ms, volume={}, amplitude={}",
                    note.frequency, note.duration_ms, volume, amplitude
                );

                generate_tone_with_amplitude(
                    note.frequency,
                    note.duration_ms,
                    amplitude,
                    audio_buffer,
                    &mut left,
                    &mut right,
                )
                .await;
            }
            catears::audio::Mode::Chiptune(sequence) => {
                debug!(
                    "Playing chiptune: length={}, looping={}, default_volume={}",
                    sequence.length, sequence.looping, sequence.default_volume
                );
                // Play a chiptune sequence
                let default_volume = sequence.default_volume;
                let master_volume = speaker_state.volume;

                loop {
                    for (i, note) in sequence.notes[..usize::from(sequence.length)]
                        .iter()
                        .enumerate()
                    {
                        let note_volume = note.volume.unwrap_or(default_volume);
                        debug!(
                            "Playing note {}/{}: frequency={}Hz, duration={}ms, volume={}",
                            i + 1,
                            sequence.length,
                            note.frequency,
                            note.duration_ms,
                            note_volume
                        );

                        // Calculate combined amplitude with master volume
                        #[allow(clippy::cast_precision_loss)]
                        let amplitude = (32767.0 * f32::from(note_volume) / 255.0)
                            * (f32::from(master_volume) / 255.0)
                            * 0.5;

                        generate_tone_with_amplitude(
                            note.frequency,
                            note.duration_ms,
                            amplitude,
                            audio_buffer,
                            &mut left,
                            &mut right,
                        )
                        .await;

                        // Check if mode changed
                        if state.read().await.speakers.mode != speaker_state.mode {
                            debug!("Audio mode changed, breaking from note playback");
                            break;
                        }
                    }

                    if !sequence.looping || state.read().await.speakers.mode != speaker_state.mode {
                        debug!("Chiptune sequence complete or mode changed");
                        break;
                    }
                    debug!("Looping chiptune sequence");
                }
            }
            catears::audio::Mode::Audio(_clip) => {
                // TODO: Implement raw audio playback
                warn!("Raw audio playback not yet implemented");
                Timer::after(embassy_time::Duration::from_millis(100)).await;
            }
        }
    }
}

async fn generate_tone_with_amplitude(
    frequency: f32,
    duration_ms: u16,
    amplitude: f32,
    audio_buffer: &mut [i16; 8192],
    left: &mut I2sTx<'static, esp_hal::Async>,
    right: &mut I2sTx<'static, esp_hal::Async>,
) {
    const HARDWARE_SAMPLE_RATE: f32 = 44100.0;
    const FADE_SAMPLES: usize = 220;

    // Calculate samples needed for this note duration
    #[allow(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        clippy::cast_precision_loss
    )]
    let total_samples = ((HARDWARE_SAMPLE_RATE * f32::from(duration_ms)) / 1000.0) as usize;
    let stereo_samples = (total_samples * 2).min(8192);

    // Generate the tone
    if frequency > 0.0 {
        for i in 0..stereo_samples / 2 {
            #[allow(clippy::cast_precision_loss)]
            let phase = 2.0 * core::f32::consts::PI * frequency * i as f32 / HARDWARE_SAMPLE_RATE;
            let sine_value = libm::sinf(phase);

            // Apply fade in/out envelope to reduce pops
            let envelope = calculate_envelope(i, stereo_samples / 2, FADE_SAMPLES);

            #[allow(clippy::cast_possible_truncation)]
            let sample = (sine_value * amplitude * envelope) as i16;

            audio_buffer[i * 2] = sample; // Left
            audio_buffer[i * 2 + 1] = sample; // Right
        }
    } else {
        // Generate silence for rests
        audio_buffer
            .iter_mut()
            .take(stereo_samples)
            .for_each(|sample| *sample = 0);
    }

    let audio_bytes: &mut [u8] = bytemuck::cast_slice_mut(&mut audio_buffer[..stereo_samples]);

    if let Err(e) = left.write_dma_async(audio_bytes).await {
        info!("Left channel DMA write failed: {:?}", e);
    }
    if let Err(e) = right.write_dma_async(audio_bytes).await {
        info!("Right channel DMA write failed: {:?}", e);
    }

    Timer::after(embassy_time::Duration::from_millis(duration_ms.into())).await;
}

fn calculate_envelope(sample_index: usize, total_samples: usize, fade_samples: usize) -> f32 {
    if sample_index < fade_samples {
        // Fade in
        #[allow(clippy::cast_precision_loss)]
        let fade_progress = sample_index as f32 / fade_samples as f32;
        fade_progress
    } else if sample_index > total_samples.saturating_sub(fade_samples) {
        // Fade out
        #[allow(clippy::cast_precision_loss)]
        let fade_progress = (total_samples - sample_index) as f32 / fade_samples as f32;
        fade_progress
    } else {
        // Full volume
        1.0
    }
}

#[embassy_executor::task]
async fn control_servos(
    state: &'static RwLock<CriticalSectionRawMutex, catears::state::State>,
    mut servo_left: catears::servo::Servo<
        esp_hal::mcpwm::operator::PwmPin<'static, esp_hal::peripherals::MCPWM0<'static>, 0, true>,
    >,
    mut servo_right: catears::servo::Servo<
        esp_hal::mcpwm::operator::PwmPin<'static, esp_hal::peripherals::MCPWM0<'static>, 0, false>,
    >,
) -> ! {
    loop {
        let positions = state.read().await.servos;

        servo_left
            .set_rotation(positions.left)
            .expect("unable to set servo_left rotation");
        servo_right
            .set_rotation(positions.right)
            .expect("unable to set servo_right rotation");

        Timer::after(embassy_time::Duration::from_millis(10)).await;
    }
}
#[derive(Default)]
struct AnimationState {
    left: PatternState,
    right: PatternState,
}

#[derive(Default)]
struct PatternState {
    position: u8,
    hue: u8,
    pulse_phase: u16,
}

#[embassy_executor::task]
async fn control_leds(
    state: &'static RwLock<CriticalSectionRawMutex, catears::state::State>,
    mut left: SmartLedsAdapterAsync<
        rmt::ConstChannelAccess<rmt::Tx, 1>,
        { esp_hal_smartled::buffer_size_async(12) },
    >,
    mut right: SmartLedsAdapterAsync<
        rmt::ConstChannelAccess<rmt::Tx, 2>,
        { esp_hal_smartled::buffer_size_async(12) },
    >,
) -> ! {
    let mut animation_state = AnimationState::default();

    loop {
        let lights = state.read().await.lights;
        let brightness_scale = lights.brightness;

        // Process left LED ring
        let left_colors =
            generate_pattern(&lights.left, &mut animation_state.left, brightness_scale);
        left.write(left_colors.into_iter())
            .await
            .expect("unable to write to left LED ring");

        // Process right LED ring
        let right_colors =
            generate_pattern(&lights.right, &mut animation_state.right, brightness_scale);
        right
            .write(right_colors.into_iter())
            .await
            .expect("unable to write to right LED ring");

        Timer::after(embassy_time::Duration::from_millis(10)).await;
    }
}

fn generate_pattern(
    mode: &catears::lights::Mode,
    state: &mut PatternState,
    brightness_scale: u8,
) -> [smart_leds::RGB8; 12] {
    let mut colors = [smart_leds::RGB8::new(0, 0, 0); 12];

    match mode {
        catears::lights::Mode::Off => {
            // All LEDs off - already initialized to black
        }
        catears::lights::Mode::Solid(color) => {
            let scaled = scale_brightness(*color, brightness_scale);
            colors.fill(scaled);
        }
        catears::lights::Mode::Gradient(start, end) => {
            for (i, color) in colors.iter_mut().enumerate() {
                #[allow(clippy::cast_precision_loss)]
                let t = i as f32 / 11.0;
                let interpolated = interpolate_color(*start, *end, t);
                *color = scale_brightness(interpolated, brightness_scale);
            }
        }
        catears::lights::Mode::Chase(pattern) => {
            // Update position based on speed (10ms per loop iteration)
            state.position = state.position.wrapping_add(1);
            let steps_per_rotation = (pattern.speed_ms / 10).max(1);
            #[allow(clippy::cast_possible_truncation)]
            let current_step = (state.position / steps_per_rotation as u8) % 12;

            // Fill background
            let bg = scale_brightness(pattern.background, brightness_scale);
            colors.fill(bg);

            // Draw chase pattern
            for i in 0..pattern.length {
                let pos = if pattern.clockwise {
                    (current_step + i) % 12
                } else {
                    (12 + current_step - i) % 12
                };
                colors[pos as usize] = scale_brightness(pattern.color, brightness_scale);
            }
        }
        catears::lights::Mode::Pulse(pattern) => {
            // Update pulse phase
            state.pulse_phase = state.pulse_phase.wrapping_add(10); // 10ms per iteration
            let phase = state.pulse_phase % pattern.period_ms;
            let t = f32::from(phase) / f32::from(pattern.period_ms);

            // Calculate brightness using sine wave
            let sine = libm::sinf(t * 2.0 * core::f32::consts::PI);
            let normalized = f32::midpoint(sine, 1.0); // Map from [-1,1] to [0,1]
            let brightness = f32::from(pattern.min_brightness)
                + f32::from(pattern.max_brightness - pattern.min_brightness) * normalized;

            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            let pulsed = scale_brightness(pattern.color, brightness as u8);
            let final_color = scale_brightness(pulsed, brightness_scale);
            colors.fill(final_color);
        }
        catears::lights::Mode::Rainbow(pattern) => {
            // Update hue based on speed
            let hue_step = 255 / (pattern.speed_ms / 10).max(1);
            #[allow(clippy::cast_possible_truncation)]
            let hue_increment = hue_step as u8;
            state.hue = state.hue.wrapping_add(hue_increment);

            if pattern.spread {
                // Rainbow spread across all LEDs
                for (i, color) in colors.iter_mut().enumerate() {
                    #[allow(clippy::cast_possible_truncation)]
                    let hue = state.hue.wrapping_add((i * 21) as u8); // 21 = 255/12
                    let hsv = Hsv {
                        hue,
                        sat: 255,
                        val: pattern.brightness,
                    };
                    *color = scale_brightness(hsv2rgb(hsv), brightness_scale);
                }
            } else {
                // All LEDs same color
                let hsv = Hsv {
                    hue: state.hue,
                    sat: 255,
                    val: pattern.brightness,
                };
                let color = scale_brightness(hsv2rgb(hsv), brightness_scale);
                colors.fill(color);
            }
        }
        catears::lights::Mode::Custom(pattern) => {
            for (i, color) in colors.iter_mut().enumerate() {
                *color = scale_brightness(pattern.leds[i], brightness_scale);
            }
        }
    }

    colors
}

fn scale_brightness(color: smart_leds::RGB8, scale: u8) -> smart_leds::RGB8 {
    #[allow(clippy::cast_possible_truncation)]
    let r = ((u16::from(color.r) * u16::from(scale)) / 255) as u8;
    #[allow(clippy::cast_possible_truncation)]
    let g = ((u16::from(color.g) * u16::from(scale)) / 255) as u8;
    #[allow(clippy::cast_possible_truncation)]
    let b = ((u16::from(color.b) * u16::from(scale)) / 255) as u8;

    smart_leds::RGB8::new(r, g, b)
}

fn interpolate_color(start: smart_leds::RGB8, end: smart_leds::RGB8, t: f32) -> smart_leds::RGB8 {
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let r = (f32::from(start.r) + (f32::from(end.r) - f32::from(start.r)) * t) as u8;
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let g = (f32::from(start.g) + (f32::from(end.g) - f32::from(start.g)) * t) as u8;
    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let b = (f32::from(start.b) + (f32::from(end.b) - f32::from(start.b)) * t) as u8;

    smart_leds::RGB8::new(r, g, b)
}
