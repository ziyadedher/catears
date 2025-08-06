#![allow(clippy::doc_markdown)]

use defmt::{info, warn};
use embassy_net::{DhcpConfig, Runner, StackResources};
use embassy_time::{Duration, Timer};
use esp_hal::peripherals::WIFI;
use esp_wifi::{
    wifi::{WifiController, WifiDevice},
    EspWifiController, EspWifiRngSource, EspWifiTimerSource, InitializationError,
};
use static_cell::StaticCell;

/// Static storage for the ESP WiFi radio controller.
///
/// This static cell provides thread-safe storage for the ESP WiFi controller instance that manages the radio hardware.
/// It's initialized once during the WiFi setup process and then used throughout the application lifetime to control
/// WiFi operations.
static RADIO_CONTROLLER: StaticCell<EspWifiController> = StaticCell::new();

/// Static storage for networking stack resources.
///
/// This static cell allocates memory for the embassy-net networking stack resources, configured to support up to 8
/// concurrent network connections/sockets. The resources include buffers and state management structures needed for
/// TCP/UDP networking operations.
static NETWORKING_STACK_RESOURCES: StaticCell<StackResources<8>> = StaticCell::new();

/// Configuration parameters for WiFi networking setup.
///
/// This struct contains all the necessary configuration parameters to establish a WiFi connection and configure the
/// networking stack, including both WiFi client settings and DHCP configuration.
///
/// # Examples
///
/// ```rust,no_run
/// use catears::wifi::Config;
/// use esp_wifi::wifi::ClientConfiguration;
///
/// let config = Config {
///     client: ClientConfiguration {
///         ssid: "MyWiFiNetwork".into(),
///         password: "MyPassword123".into(),
///         ..Default::default()
///     },
///     dhcp_hostname: "my-device".into(),
/// };
/// ```
pub struct Config {
    /// WiFi client configuration containing SSID, password, and other connection parameters.
    ///
    /// This configuration defines how the device will connect to the WiFi access point, including the network name
    /// (SSID), password, and optional advanced settings like channel, authentication method, and power management
    /// options.
    pub client: esp_wifi::wifi::ClientConfiguration,

    /// Hostname to be used for DHCP requests.
    ///
    /// This hostname will be sent to the DHCP server during the IP address assignment process. It helps identify the
    /// device on the network and may be used by network administrators for device management. The hostname should be a
    /// valid DNS name and is typically limited to 32 characters or less.
    pub dhcp_hostname: heapless::String<32>,
}

/// Initializes the WiFi networking stack and connects to the configured access point.
///
/// This function performs the complete WiFi initialization sequence including:
/// - Initializing the radio controller
/// - Configuring and starting the WiFi client
/// - Connecting to the specified access point with retry logic
/// - Setting up the networking stack with DHCP configuration
/// - Spawning the network runner task
/// - Waiting for link and configuration to be established
///
/// # Parameters
///
/// * `config` - WiFi and networking configuration parameters
/// * `timer` - Timer source for WiFi operations
/// * `rng` - Random number generator for WiFi operations
/// * `wifi` - WiFi peripheral instance
/// * `spawner` - Executor spawner for running the network stack task
///
/// # Returns
///
/// Returns a configured and connected `embassy_net::Stack` on success.
///
/// # Errors
///
/// Forwards any initialization errors from the WiFi stack or networking stack setup.
///
/// # Panics
///
/// Panics if the networking stack runner task cannot be spawned on the provided executor.
pub async fn init(
    config: Config,
    timer: impl EspWifiTimerSource + 'static,
    mut rng: impl EspWifiRngSource + 'static,
    wifi: WIFI<'static>,
    spawner: &embassy_executor::Spawner,
) -> Result<embassy_net::Stack<'static>, InitializationError> {
    let seed = rng.next_u64();
    let radio_controller = RADIO_CONTROLLER.init({
        let init = esp_wifi::init(timer, rng)?;
        info!("Radio initialized!");
        init
    });

    let (wifi_controller, wifi_interface) = {
        let (mut controller, interfaces) = esp_wifi::wifi::new(radio_controller, wifi)?;
        controller.set_configuration(&esp_wifi::wifi::Configuration::Client(config.client))?;
        controller.start_async().await?;
        loop {
            match controller.connect_async().await {
                Ok(()) => {
                    info!("WiFi connected!");
                    break;
                }
                Err(e) => {
                    warn!("Failed to connect to WiFi: {:?}", e);
                    Timer::after(Duration::from_millis(5000)).await;
                }
            }
        }

        (controller, interfaces.sta)
    };

    let stack = {
        let mut dhcp_config = DhcpConfig::default();
        info!(
            "Setting hostname for DHCP configuration: {}",
            config.dhcp_hostname
        );
        dhcp_config.hostname = Some(config.dhcp_hostname);

        let config = embassy_net::Config::dhcpv4(dhcp_config);
        let (stack, runner) = embassy_net::new(
            wifi_interface,
            config,
            NETWORKING_STACK_RESOURCES.init(StackResources::new()),
            // Note that this is bad randomness since we're casting the u32 to a u64, but we don't really care.
            seed,
        );

        spawner
            .spawn(net_task(wifi_controller, runner))
            .expect("Failed to spawn stack runner");

        stack.wait_link_up().await;
        stack.wait_config_up().await;

        if let Some(config) = stack.config_v4() {
            info!("Stack initialized with IP: {}", config.address.address());
        } else {
            warn!("Stack initialized, but could not find IP address.");
        }
        stack
    };

    Ok(stack)
}

#[embassy_executor::task]
async fn net_task(
    wifi_controller: WifiController<'static>,
    mut runner: Runner<'static, WifiDevice<'static>>,
) -> ! {
    // We need to hold on to the wifi_controller to keep the WiFi device alive. If we don't do this, we get weird
    // memory issues...
    let _ = wifi_controller;
    info!("Starting networking stack runner...");
    runner.run().await
}
