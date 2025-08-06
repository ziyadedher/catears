use core::convert::Infallible;

use embassy_sync::{blocking_mutex::raw::CriticalSectionRawMutex, rwlock::RwLock};
use embedded_cli::{
    arguments::{FromArgument, FromArgumentError},
    cli::CliBuilder,
    Command,
};
use embedded_io_async::{Read as _, Write as _};
use esp_hal::{
    usb_serial_jtag::{UsbSerialJtag, UsbSerialJtagRx, UsbSerialJtagTx},
    Async,
};
use smart_leds::RGB8;
use ufmt::{uDebug, uwrite, Formatter};

/// Size of the command buffer for the CLI.
///
/// This buffer stores the current command being typed by the user. The size determines the maximum length of a single
/// command line that can be entered.
const COMMAND_BUFFER_SIZE: usize = 64;

/// Size of the history buffer for the CLI.
///
/// This buffer stores previously entered commands for recall using up/down arrow keys. The size determines how many
/// bytes of command history can be stored.
const HISTORY_BUFFER_SIZE: usize = 128;

/// Root command enumeration for the CLI.
///
/// This enum defines all top-level commands available in the command-line interface. Each variant represents a
/// different subsystem that can be controlled through the CLI.
#[derive(Command)]
enum Command {
    /// System status commands
    Status {
        #[command(subcommand)]
        action: StatusCommand,
    },
    /// Light control commands
    Light {
        #[command(subcommand)]
        action: LightCommand,
    },
    /// Servo control commands
    Servo {
        #[command(subcommand)]
        action: ServoCommand,
    },
    /// Audio control commands
    Audio {
        #[command(subcommand)]
        action: AudioCommand,
    },
}

/// Status-related subcommands.
///
/// These commands provide read-only access to system state information.
#[derive(Command)]
enum StatusCommand {
    /// Get current system status
    Get,
}

/// Light control subcommands.
///
/// These commands allow reading and modifying the LED light modes on either side of the device.
#[derive(Command)]
enum LightCommand {
    /// Get light status
    Get {
        /// Light side (left or right)
        side: Side,
    },
    /// Set light to solid color
    Solid {
        /// Light side (left or right)
        side: Side,
        /// Red value (0-255)
        r: u8,
        /// Green value (0-255)
        g: u8,
        /// Blue value (0-255)
        b: u8,
    },
    /// Set light to off
    Off {
        /// Light side (left or right)
        side: Side,
    },
    /// Set light to rainbow pattern
    Rainbow {
        /// Light side (left or right)
        side: Side,
    },
    /// Set light to pulse pattern
    Pulse {
        /// Light side (left or right)
        side: Side,
        /// Red value (0-255)
        r: u8,
        /// Green value (0-255)
        g: u8,
        /// Blue value (0-255)
        b: u8,
    },
    /// Set global brightness
    Brightness {
        /// Brightness value (0-255)
        value: u8,
    },
}

/// Servo control subcommands.
///
/// These commands allow reading and modifying the servo motor positions on either side of the device.
#[derive(Command)]
enum ServoCommand {
    /// Get servo position
    Get {
        /// Servo side (left or right)
        side: Side,
    },
    /// Set servo position
    Set {
        /// Servo side (left or right)
        side: Side,
        /// Position value (0-255)
        value: u8,
    },
}

/// Audio control subcommands.
///
/// These commands allow controlling the audio output including tones, chiptunes, and volume.
#[derive(Command)]
enum AudioCommand {
    /// Get current audio status
    Get,
    /// Set audio to silent
    Silent,
    /// Play a tone
    Tone {
        /// Frequency in Hz
        freq: u16,
        /// Duration in milliseconds
        duration: u16,
    },
    /// Play a predefined chiptune
    Chiptune {
        /// Chiptune name
        name: ChiptuneName,
    },
    /// Set volume
    Volume {
        /// Volume level (0-255)
        value: u8,
    },
}

/// Represents a side selection (left or right).
///
/// This enum is used throughout the CLI to specify which side of the device (left or right) a command should
/// operate on. It supports both full names ("left", "right") and abbreviations ("l", "r") for convenience.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Side {
    /// Left side
    Left,
    /// Right side
    Right,
}

impl<'a> FromArgument<'a> for Side {
    fn from_arg(arg: &'a str) -> Result<Self, FromArgumentError<'a>> {
        match arg.to_lowercase().as_str() {
            "left" | "l" => Ok(Side::Left),
            "right" | "r" => Ok(Side::Right),
            _ => Err(FromArgumentError {
                value: arg,
                expected: "left (l) or right (r)",
            }),
        }
    }
}

impl uDebug for Side {
    fn fmt<W>(&self, f: &mut Formatter<'_, W>) -> Result<(), W::Error>
    where
        W: ufmt::uWrite + ?Sized,
    {
        match self {
            Side::Left => f.write_str("Left"),
            Side::Right => f.write_str("Right"),
        }
    }
}

/// Predefined chiptune names that can be played.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ChiptuneName {
    Coin,
    PowerUp,
    LevelComplete,
    GameOver,
    MenuSelect,
    Alert,
    Happy,
    Sad,
    Startup,
    Shutdown,
}

impl<'a> FromArgument<'a> for ChiptuneName {
    fn from_arg(arg: &'a str) -> Result<Self, FromArgumentError<'a>> {
        match arg.to_lowercase().as_str() {
            "coin" => Ok(ChiptuneName::Coin),
            "powerup" => Ok(ChiptuneName::PowerUp),
            "levelcomplete" | "level" => Ok(ChiptuneName::LevelComplete),
            "gameover" => Ok(ChiptuneName::GameOver),
            "menuselect" | "menu" => Ok(ChiptuneName::MenuSelect),
            "alert" => Ok(ChiptuneName::Alert),
            "happy" => Ok(ChiptuneName::Happy),
            "sad" => Ok(ChiptuneName::Sad),
            "startup" => Ok(ChiptuneName::Startup),
            "shutdown" => Ok(ChiptuneName::Shutdown),
            _ => Err(FromArgumentError {
                value: arg,
                expected: "coin, powerup, levelcomplete, gameover, menuselect, alert, happy, sad, startup, or shutdown",
            }),
        }
    }
}

/// Initializes the command-line interface for controlling the device.
///
/// This function sets up the CLI over USB serial JTAG, configuring it with appropriate buffers and spawning the
/// handler task that processes incoming commands. The CLI provides an interactive interface for controlling servos,
/// lights, audio, and querying system status.
///
/// # Parameters
///
/// * `state` - Shared state containing servo, light, and audio values that will be read and modified by CLI commands
/// * `serial` - USB serial JTAG peripheral for communication with the host
/// * `spawner` - Executor spawner for running the CLI handler task
///
/// # Panics
///
/// Panics if:
/// - Failed to write the initial header or help message to the serial port
/// - Failed to build the CLI instance
/// - Failed to spawn the CLI handler task on the provided executor
pub async fn init(
    state: &'static RwLock<CriticalSectionRawMutex, crate::state::State>,
    mut serial: UsbSerialJtag<'static, esp_hal::Async>,
    spawner: &embassy_executor::Spawner,
) {
    serial
        .write_all(b"Catears Command Line\r\n")
        .await
        .expect("Failed to write header");
    serial
        .write_all(b"Type 'help' for available commands\r\n")
        .await
        .expect("Failed to write help message");

    let (serial_rx, serial_tx) = serial.split();
    let cli = CliBuilder::default()
        .writer(serial_tx)
        .command_buffer([0; COMMAND_BUFFER_SIZE])
        .history_buffer([0; HISTORY_BUFFER_SIZE])
        .prompt("> ")
        .build()
        .expect("Failed to build CLI");

    spawner
        .spawn(handler(state, serial_rx, cli))
        .expect("Failed to spawn CLI handler");
}

/// CLI handler task that processes incoming commands.
///
/// This task runs indefinitely, reading bytes from the serial port and processing them through the CLI. When complete
/// commands are entered, they are parsed and executed, potentially modifying the shared system state. The handler
/// implements a read-modify-write pattern to safely update state only when changes are made.
///
/// The task supports the following command categories:
/// - Status queries for reading current servo, light, and audio values
/// - Light control for setting various LED modes on left/right sides
/// - Servo control for setting positions on left/right sides
/// - Audio control for playing tones, chiptunes, and adjusting volume
///
/// # Parameters
///
/// * `state` - Shared state containing servo, light, and audio values
/// * `serial_rx` - Receive half of the USB serial connection
/// * `cli` - Configured CLI instance for processing commands
#[allow(clippy::too_many_lines)]
#[embassy_executor::task]
async fn handler(
    state: &'static RwLock<CriticalSectionRawMutex, crate::state::State>,
    mut serial_rx: UsbSerialJtagRx<'static, Async>,
    mut cli: embedded_cli::cli::Cli<
        UsbSerialJtagTx<'static, Async>,
        Infallible,
        [u8; COMMAND_BUFFER_SIZE],
        [u8; HISTORY_BUFFER_SIZE],
    >,
) {
    loop {
        let mut buffer = [0u8; 1];
        if serial_rx.read(&mut buffer).await.is_ok() {
            // Read the current state once before processing commands
            let mut state_copy = *state.read().await;

            let _ = cli.process_byte::<Command, _>(
                buffer[0],
                &mut Command::processor(|cli, command| {
                    match command {
                        Command::Status { action } => {
                            match action {
                                StatusCommand::Get => {
                                    // Display servo positions
                                    uwrite!(
                                        cli.writer(),
                                        "System Status:\r\n  Servos - Left: {}, Right: {}\r\n",
                                        state_copy.servos.left,
                                        state_copy.servos.right,
                                    )?;

                                    // Display light modes
                                    uwrite!(cli.writer(), "  Lights:\r\n")?;
                                    uwrite!(cli.writer(), "    Left: ")?;
                                    display_light_mode(cli.writer(), &state_copy.lights.left)?;
                                    uwrite!(cli.writer(), "\r\n    Right: ")?;
                                    display_light_mode(cli.writer(), &state_copy.lights.right)?;
                                    uwrite!(
                                        cli.writer(),
                                        "\r\n    Brightness: {}\r\n",
                                        state_copy.lights.brightness
                                    )?;

                                    // Display audio status
                                    uwrite!(cli.writer(), "  Audio:\r\n    Mode: ")?;
                                    display_audio_mode(cli.writer(), &state_copy.speakers.mode)?;
                                    uwrite!(
                                        cli.writer(),
                                        "\r\n    Volume: {}\r\n",
                                        state_copy.speakers.volume
                                    )?;
                                }
                            }
                        }
                        Command::Light { action } => match action {
                            LightCommand::Get { side } => {
                                let mode = match side {
                                    Side::Left => &state_copy.lights.left,
                                    Side::Right => &state_copy.lights.right,
                                };
                                uwrite!(cli.writer(), "Light {:?}: ", side)?;
                                display_light_mode(cli.writer(), mode)?;
                                uwrite!(cli.writer(), "\r\n")?;
                            }
                            LightCommand::Solid { side, r, g, b } => {
                                let color = RGB8::new(r, g, b);
                                match side {
                                    Side::Left => {
                                        state_copy.lights.left = crate::lights::Mode::Solid(color);
                                        uwrite!(
                                            cli.writer(),
                                            "Set left light to solid RGB({},{},{})\r\n",
                                            r,
                                            g,
                                            b
                                        )?;
                                    }
                                    Side::Right => {
                                        state_copy.lights.right = crate::lights::Mode::Solid(color);
                                        uwrite!(
                                            cli.writer(),
                                            "Set right light to solid RGB({},{},{})\r\n",
                                            r,
                                            g,
                                            b
                                        )?;
                                    }
                                }
                            }
                            LightCommand::Off { side } => match side {
                                Side::Left => {
                                    state_copy.lights.left = crate::lights::Mode::Off;
                                    uwrite!(cli.writer(), "Turned off left light\r\n")?;
                                }
                                Side::Right => {
                                    state_copy.lights.right = crate::lights::Mode::Off;
                                    uwrite!(cli.writer(), "Turned off right light\r\n")?;
                                }
                            },
                            LightCommand::Rainbow { side } => {
                                let pattern = crate::lights::RainbowPattern::new(500);
                                match side {
                                    Side::Left => {
                                        state_copy.lights.left =
                                            crate::lights::Mode::Rainbow(pattern);
                                        uwrite!(
                                            cli.writer(),
                                            "Set left light to rainbow pattern\r\n"
                                        )?;
                                    }
                                    Side::Right => {
                                        state_copy.lights.right =
                                            crate::lights::Mode::Rainbow(pattern);
                                        uwrite!(
                                            cli.writer(),
                                            "Set right light to rainbow pattern\r\n"
                                        )?;
                                    }
                                }
                            }
                            LightCommand::Pulse { side, r, g, b } => {
                                let color = RGB8::new(r, g, b);
                                let pattern = crate::lights::PulsePattern::new(color, 1000);
                                match side {
                                    Side::Left => {
                                        state_copy.lights.left =
                                            crate::lights::Mode::Pulse(pattern);
                                        uwrite!(
                                            cli.writer(),
                                            "Set left light to pulse RGB({},{},{})\r\n",
                                            r,
                                            g,
                                            b
                                        )?;
                                    }
                                    Side::Right => {
                                        state_copy.lights.right =
                                            crate::lights::Mode::Pulse(pattern);
                                        uwrite!(
                                            cli.writer(),
                                            "Set right light to pulse RGB({},{},{})\r\n",
                                            r,
                                            g,
                                            b
                                        )?;
                                    }
                                }
                            }
                            LightCommand::Brightness { value } => {
                                state_copy.lights.brightness = value;
                                uwrite!(cli.writer(), "Set brightness to {}\r\n", value)?;
                            }
                        },
                        Command::Servo { action } => match action {
                            ServoCommand::Get { side } => {
                                let value = match side {
                                    Side::Left => state_copy.servos.left,
                                    Side::Right => state_copy.servos.right,
                                };
                                uwrite!(cli.writer(), "Servo {:?}: {}\r\n", side, value)?;
                            }
                            ServoCommand::Set { side, value } => match side {
                                Side::Left => {
                                    state_copy.servos.left = value;
                                    uwrite!(cli.writer(), "Set left servo to {}\r\n", value)?;
                                }
                                Side::Right => {
                                    state_copy.servos.right = value;
                                    uwrite!(cli.writer(), "Set right servo to {}\r\n", value)?;
                                }
                            },
                        },
                        Command::Audio { action } => match action {
                            AudioCommand::Get => {
                                uwrite!(cli.writer(), "Audio - Mode: ")?;
                                display_audio_mode(cli.writer(), &state_copy.speakers.mode)?;
                                uwrite!(
                                    cli.writer(),
                                    ", Volume: {}\r\n",
                                    state_copy.speakers.volume
                                )?;
                            }
                            AudioCommand::Silent => {
                                state_copy.speakers.mode = crate::audio::Mode::Silent;
                                uwrite!(cli.writer(), "Set audio to silent\r\n")?;
                            }
                            AudioCommand::Tone { freq, duration } => {
                                let note = crate::audio::Note::new(f32::from(freq), duration);
                                state_copy.speakers.mode = crate::audio::Mode::Tone(note);
                                uwrite!(
                                    cli.writer(),
                                    "Playing tone: {}Hz for {}ms\r\n",
                                    freq,
                                    duration
                                )?;
                            }
                            AudioCommand::Chiptune { name } => {
                                let sequence = match name {
                                    ChiptuneName::Coin => crate::audio::chiptunes::coin_collect(),
                                    ChiptuneName::PowerUp => crate::audio::chiptunes::power_up(),
                                    ChiptuneName::LevelComplete => {
                                        crate::audio::chiptunes::level_complete()
                                    }
                                    ChiptuneName::GameOver => crate::audio::chiptunes::game_over(),
                                    ChiptuneName::MenuSelect => {
                                        crate::audio::chiptunes::menu_select()
                                    }
                                    ChiptuneName::Alert => crate::audio::chiptunes::alert(),
                                    ChiptuneName::Happy => crate::audio::chiptunes::happy(),
                                    ChiptuneName::Sad => crate::audio::chiptunes::sad(),
                                    ChiptuneName::Startup => crate::audio::chiptunes::startup(),
                                    ChiptuneName::Shutdown => crate::audio::chiptunes::shutdown(),
                                };
                                state_copy.speakers.mode = crate::audio::Mode::Chiptune(sequence);
                                uwrite!(cli.writer(), "Playing chiptune: {:?}\r\n", name)?;
                            }
                            AudioCommand::Volume { value } => {
                                state_copy.speakers.volume = value;
                                uwrite!(cli.writer(), "Set volume to {}\r\n", value)?;
                            }
                        },
                    }
                    Ok(())
                }),
            );

            // Write the modified state back if it changed
            {
                let current_state = *state.read().await;
                if current_state != state_copy {
                    let mut writable_state = state.write().await;
                    *writable_state = state_copy;
                }
            }
        }
    }
}

/// Helper function to display light mode information.
fn display_light_mode<W>(writer: &mut W, mode: &crate::lights::Mode) -> Result<(), W::Error>
where
    W: ufmt::uWrite + ?Sized,
{
    match mode {
        crate::lights::Mode::Off => uwrite!(writer, "Off"),
        crate::lights::Mode::Solid(color) => {
            uwrite!(writer, "Solid RGB({},{},{})", color.r, color.g, color.b)
        }
        crate::lights::Mode::Gradient(c1, c2) => {
            uwrite!(
                writer,
                "Gradient RGB({},{},{}) to RGB({},{},{})",
                c1.r,
                c1.g,
                c1.b,
                c2.r,
                c2.g,
                c2.b
            )
        }
        crate::lights::Mode::Chase(_) => uwrite!(writer, "Chase"),
        crate::lights::Mode::Pulse(p) => {
            uwrite!(
                writer,
                "Pulse RGB({},{},{})",
                p.color.r,
                p.color.g,
                p.color.b
            )
        }
        crate::lights::Mode::Rainbow(_) => uwrite!(writer, "Rainbow"),
        crate::lights::Mode::Custom(_) => uwrite!(writer, "Custom"),
    }
}

/// Helper function to display audio mode information.
fn display_audio_mode<W>(writer: &mut W, mode: &crate::audio::Mode) -> Result<(), W::Error>
where
    W: ufmt::uWrite + ?Sized,
{
    match mode {
        crate::audio::Mode::Silent => uwrite!(writer, "Silent"),
        crate::audio::Mode::Tone(note) => {
            uwrite!(
                writer,
                "Tone ({}Hz, {}ms)",
                note.frequency as u32,
                note.duration_ms
            )
        }
        crate::audio::Mode::Chiptune(_) => uwrite!(writer, "Chiptune"),
        crate::audio::Mode::Audio(_) => uwrite!(writer, "Audio Clip"),
    }
}

impl uDebug for ChiptuneName {
    fn fmt<W>(&self, f: &mut Formatter<'_, W>) -> Result<(), W::Error>
    where
        W: ufmt::uWrite + ?Sized,
    {
        match self {
            ChiptuneName::Coin => f.write_str("Coin"),
            ChiptuneName::PowerUp => f.write_str("PowerUp"),
            ChiptuneName::LevelComplete => f.write_str("LevelComplete"),
            ChiptuneName::GameOver => f.write_str("GameOver"),
            ChiptuneName::MenuSelect => f.write_str("MenuSelect"),
            ChiptuneName::Alert => f.write_str("Alert"),
            ChiptuneName::Happy => f.write_str("Happy"),
            ChiptuneName::Sad => f.write_str("Sad"),
            ChiptuneName::Startup => f.write_str("Startup"),
            ChiptuneName::Shutdown => f.write_str("Shutdown"),
        }
    }
}
