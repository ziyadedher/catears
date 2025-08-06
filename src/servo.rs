//! Servo motor control library for embedded systems.
//!
//! This module provides a high-level interface for controlling servo motors using PWM signals. It supports different
//! servo configurations and provides predefined constants for common servo models like SG90 and MG995.
//!
//! # Examples
//!
//! ```rust,no_run
//! use catears::servo::{Servo, Config};
//! # use embedded_hal::pwm::SetDutyCycle;
//! # struct MockPwm;
//! # impl SetDutyCycle for MockPwm {
//! #     type Error = ();
//! #     fn max_duty_cycle(&self) -> u16 { 1000 }
//! #     fn set_duty_cycle(&mut self, duty: u16) -> Result<(), Self::Error> { Ok(()) }
//! # }
//!
//! // Create a servo with SG90 configuration
//! let pwm = MockPwm;
//! let mut servo = Servo::new(pwm, Config::SG90);
//!
//! // Set servo to middle position
//! servo.set_rotation(128).unwrap();
//! ```

use core::time::Duration;

use embedded_hal::pwm::SetDutyCycle;

/// Configuration parameters for servo motor control.
///
/// This struct defines the timing parameters needed to control a servo motor using PWM signals. Different servo models
/// may require different pulse width ranges and PWM periods.
///
/// # Examples
///
/// ```rust
/// use core::time::Duration;
/// use catears::servo::Config;
///
/// // Create a custom servo configuration
/// let config = Config {
///     pwm_period: Duration::from_millis(20),
///     min_pulse_width: Duration::from_micros(1000),
///     max_pulse_width: Duration::from_micros(2000),
/// };
/// ```
pub struct Config {
    /// The PWM period (time between pulses)
    ///
    /// Most servo motors expect a 20ms (50Hz) PWM period, but some may work with different periods.
    pub pwm_period: Duration,
    /// The minimum pulse width for minimum rotation
    ///
    /// This corresponds to the pulse width that moves the servo to its minimum position (typically 0 degrees).
    pub min_pulse_width: Duration,
    /// The maximum pulse width for maximum rotation
    ///
    /// This corresponds to the pulse width that moves the servo to its maximum position (typically 180 degrees).
    pub max_pulse_width: Duration,
}

impl Config {
    /// Configuration for SG90 servo motor.
    ///
    /// Standard micro servo with 20ms PWM period and 0.5-2.5ms pulse width range.
    pub const SG90: Self = Self {
        pwm_period: Duration::from_millis(20),
        min_pulse_width: Duration::from_micros(500),
        max_pulse_width: Duration::from_micros(2500),
    };

    /// Configuration for MG995 servo motor.
    ///
    /// High-torque metal gear servo with 20ms PWM period and 0.5-2.5ms pulse width range.
    pub const MGG995: Self = Self {
        pwm_period: Duration::from_millis(20),
        min_pulse_width: Duration::from_micros(500),
        max_pulse_width: Duration::from_micros(2500),
    };
}

/// A servo motor controller that uses PWM to control servo position.
///
/// This struct wraps a PWM peripheral and provides methods to control servo rotation
/// based on the configured timing parameters.
///
/// # Type Parameters
///
/// * `P` - A type that implements `SetDutyCycle` trait for PWM control
///
/// # Examples
///
/// ```rust,no_run
/// use catears::servo::{Servo, Config};
/// # use embedded_hal::pwm::SetDutyCycle;
/// # struct MockPwm;
/// # impl SetDutyCycle for MockPwm {
/// #     type Error = ();
/// #     fn max_duty_cycle(&self) -> u16 { 1000 }
/// #     fn set_duty_cycle(&mut self, duty: u16) -> Result<(), Self::Error> { Ok(()) }
/// # }
///
/// let pwm = MockPwm;
/// let mut servo = Servo::new(pwm, Config::SG90);
///
/// // Move to minimum position
/// servo.set_rotation(0).unwrap();
///
/// // Move to maximum position
/// servo.set_rotation(255).unwrap();
/// ```
pub struct Servo<P>
where
    P: SetDutyCycle,
{
    /// The PWM peripheral used to generate control signals
    pwm: P,
    /// Configuration parameters for the servo
    config: Config,
}

impl<P> Servo<P>
where
    P: SetDutyCycle,
{
    /// Creates a new servo controller with the given PWM peripheral and configuration.
    ///
    /// # Parameters
    ///
    /// * `pwm` - A PWM peripheral that implements `SetDutyCycle`
    /// * `config` - Servo timing configuration parameters
    ///
    /// # Returns
    ///
    /// A new `Servo` instance ready for controlling servo position.
    ///
    /// # Examples
    ///
    /// ```rust,no_run
    /// use catears::servo::{Servo, Config};
    /// # use embedded_hal::pwm::SetDutyCycle;
    /// # struct MockPwm;
    /// # impl SetDutyCycle for MockPwm {
    /// #     type Error = ();
    /// #     fn max_duty_cycle(&self) -> u16 { 1000 }
    /// #     fn set_duty_cycle(&mut self, duty: u16) -> Result<(), Self::Error> { Ok(()) }
    /// # }
    ///
    /// let pwm = MockPwm;
    /// let servo = Servo::new(pwm, Config::SG90);
    /// ```
    pub fn new(pwm: P, config: Config) -> Self {
        Self { pwm, config }
    }

    /// Sets the servo rotation based on the input value between 0 and 255.
    ///
    /// The rotation value is linearly mapped to the pulse width range defined in the configuration:
    /// - `0` corresponds to minimum rotation (`min_pulse_width`)
    /// - `255` corresponds to maximum rotation (`max_pulse_width`)
    /// - Values in between are linearly interpolated
    ///
    /// # Parameters
    ///
    /// * `rotation` - Desired rotation value from 0 (minimum) to 255 (maximum)
    ///
    /// # Returns
    ///
    /// * `Ok(())` if the servo position was set successfully
    /// * `Err(P::Error)` if the PWM duty cycle could not be set
    ///
    /// # Errors
    ///
    /// Returns an error if the PWM duty cycle cannot be set.
    ///
    /// # Panics
    ///
    /// Panics if the calculated duty cycle cannot be converted to u16. This should not happen
    /// in normal operation with reasonable servo configurations.
    ///
    /// # Examples
    ///
    /// ```rust,no_run
    /// # use catears::servo::{Servo, Config};
    /// # use embedded_hal::pwm::SetDutyCycle;
    /// # struct MockPwm;
    /// # impl SetDutyCycle for MockPwm {
    /// #     type Error = ();
    /// #     fn max_duty_cycle(&self) -> u16 { 1000 }
    /// #     fn set_duty_cycle(&mut self, duty: u16) -> Result<(), Self::Error> { Ok(()) }
    /// # }
    /// # let pwm = MockPwm;
    /// let mut servo = Servo::new(pwm, Config::SG90);
    ///
    /// // Set to minimum position
    /// servo.set_rotation(0)?;
    ///
    /// // Set to middle position
    /// servo.set_rotation(128)?;
    ///
    /// // Set to maximum position
    /// servo.set_rotation(255)?;
    /// # Ok::<(), ()>(())
    /// ```
    pub fn set_rotation(&mut self, rotation: u8) -> Result<(), P::Error> {
        let tick_width_us =
            self.config.pwm_period.as_micros() / u128::from(self.pwm.max_duty_cycle() + 1);
        let min_duty = self.config.min_pulse_width.as_micros() / tick_width_us;
        let max_duty = self.config.max_pulse_width.as_micros() / tick_width_us;
        let duty_range = max_duty - min_duty;
        let desired_duty = min_duty + ((duty_range * u128::from(rotation)) / u128::from(u8::MAX));
        self.pwm
            .set_duty_cycle(u16::try_from(desired_duty).expect("desired duty too large"))
    }
}
