//! State management for hardware control.
//!
//! This module defines the data structures used to represent and control the various hardware components of the
//! catears device, including servo motors for ear movement, RGB LED lights, and speakers for audio playback.

use crate::audio::Mode as AudioMode;
use crate::lights::Mode as LightMode;
use serde::{Deserialize, Serialize};

/// Complete state representation of all controllable hardware components.
///
/// This struct encapsulates the current state of all hardware peripherals that can be controlled, providing a single
/// source of truth for the device's configuration at any given moment.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct State {
    /// Servo motor positions for ear movement control.
    pub servos: Servos,
    /// RGB LED light configuration for visual feedback.
    pub lights: Lights,
    /// Speaker configuration for audio output.
    pub speakers: Speakers,
}

impl State {
    /// Creates a new state with compile-time constant default values.
    ///
    /// This const function allows for static initialization of the state structure, which is useful for embedded
    /// systems where runtime initialization should be minimized.
    ///
    /// # Returns
    ///
    /// A new `State` instance with all components set to their default values.
    #[must_use]
    pub const fn default_const() -> Self {
        Self {
            servos: Servos::default_const(),
            lights: Lights::default_const(),
            speakers: Speakers::default_const(),
        }
    }
}

/// Servo operation mode for each ear.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum ServoMode {
    /// Static position mode - servo holds a fixed position.
    Static(u8), // 0-255, center at 125
    /// Sweep mode - servo continuously moves between two positions.
    Sweep {
        /// Starting position (0-255).
        min: u8,
        /// Ending position (0-255).
        max: u8,
        /// Time in milliseconds for one complete sweep (min to max).
        speed_ms: u32,
    },
    /// Twitch mode - random small movements for lifelike effect.
    Twitch {
        /// Center position to twitch around (0-255).
        center: u8,
        /// Maximum deviation from center (0-50).
        amplitude: u8,
        /// Average time between twitches in milliseconds.
        interval_ms: u32,
    },
}

impl Default for ServoMode {
    fn default() -> Self {
        Self::Static(125) // Center position
    }
}

/// Servo motor control state for ear positioning.
///
/// Controls the position and movement patterns of left and right servo motors that actuate the cat ear movements.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct Servos {
    /// Left ear servo mode.
    pub left: ServoMode,
    /// Right ear servo mode.
    pub right: ServoMode,
}

impl Servos {
    /// Creates servo configuration with compile-time constant default values.
    ///
    /// Both servos are initialized to their center position (125), which typically represents ears in a neutral,
    /// upright position.
    ///
    /// # Returns
    ///
    /// A new `Servos` instance with both motors at center position.
    #[must_use]
    pub const fn default_const() -> Self {
        Self {
            left: ServoMode::Static(125),
            right: ServoMode::Static(125),
        }
    }
}

/// RGB LED light control state for visual effects.
///
/// Controls the LED rings in the left and right cat ears. Each ring contains 12 individually addressable RGB LEDs.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct Lights {
    /// Left ear LED ring configuration.
    pub left: LightMode,
    /// Right ear LED ring configuration.
    pub right: LightMode,
    /// Global brightness multiplier (0-255).
    pub brightness: u8,
}

impl Lights {
    /// Creates light configuration with compile-time constant default values.
    ///
    /// Both LED rings are initialized to off state with full brightness capability.
    ///
    /// # Returns
    ///
    /// A new `Lights` instance with both rings off.
    #[must_use]
    pub const fn default_const() -> Self {
        Self {
            left: LightMode::Pulse(crate::lights::PulsePattern::new(
                smart_leds::RGB8::new(255, 0, 0),
                250,
            )),
            right: LightMode::Pulse(crate::lights::PulsePattern::new(
                smart_leds::RGB8::new(255, 0, 0),
                250,
            )),
            brightness: 255,
        }
    }
}

/// Speaker control state for audio output.
///
/// Manages the audio playback state for the speakers, supporting both simple tone generation and playback of
/// predefined chiptune melodies.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub struct Speakers {
    /// Current audio mode determining what sound is being played.
    pub mode: AudioMode,
    /// Master volume level (0-255) that scales all audio output.
    pub volume: u8,
}

impl Speakers {
    /// Creates speaker configuration with compile-time constant default values.
    ///
    /// Initializes to silent mode with no audio playback and medium volume.
    ///
    /// # Returns
    ///
    /// A new `Speakers` instance in silent mode.
    #[must_use]
    pub const fn default_const() -> Self {
        Self {
            mode: AudioMode::Silent,
            volume: 128,
        }
    }
}
