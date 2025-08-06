use serde::{Deserialize, Serialize};
use smart_leds::RGB8;

/// Light modes for the LED rings.
///
/// Defines various lighting patterns and effects available for the 12-LED rings in each ear.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
pub enum Mode {
    /// All LEDs off.
    #[default]
    Off,

    /// All LEDs set to a single solid color.
    Solid(RGB8),

    /// Gradient between two colors across the ring.
    Gradient(RGB8, RGB8),

    /// Chase pattern with configurable parameters.
    Chase(ChasePattern),

    /// Pulse/breathing effect.
    Pulse(PulsePattern),

    /// Rainbow effect cycling through colors.
    Rainbow(RainbowPattern),

    /// Custom pattern with individual LED control.
    Custom(LedPattern),
}

/// Chase pattern configuration for LED animation.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ChasePattern {
    /// Primary color of the chase.
    pub color: RGB8,
    /// Background color (default is off).
    pub background: RGB8,
    /// Number of LEDs in the chase segment (1-12).
    pub length: u8,
    /// Speed of rotation in milliseconds per step.
    pub speed_ms: u16,
    /// Direction of rotation (true = clockwise).
    pub clockwise: bool,
}

impl ChasePattern {
    /// Creates a new chase pattern.
    #[must_use]
    pub const fn new(color: RGB8, length: u8, speed_ms: u16) -> Self {
        Self {
            color,
            background: RGB8::new(0, 0, 0),
            length,
            speed_ms,
            clockwise: true,
        }
    }

    /// Sets the background color.
    #[must_use]
    pub const fn with_background(mut self, background: RGB8) -> Self {
        self.background = background;
        self
    }

    /// Sets counter-clockwise rotation.
    #[must_use]
    pub const fn counter_clockwise(mut self) -> Self {
        self.clockwise = false;
        self
    }
}

/// Pulse/breathing pattern configuration.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PulsePattern {
    /// Color to pulse.
    pub color: RGB8,
    /// Minimum brightness (0-255).
    pub min_brightness: u8,
    /// Maximum brightness (0-255).
    pub max_brightness: u8,
    /// Duration of one complete pulse cycle in milliseconds.
    pub period_ms: u16,
}

impl PulsePattern {
    /// Creates a new pulse pattern.
    #[must_use]
    pub const fn new(color: RGB8, period_ms: u16) -> Self {
        Self {
            color,
            min_brightness: 0,
            max_brightness: 255,
            period_ms,
        }
    }

    /// Sets the brightness range.
    #[must_use]
    pub const fn with_brightness_range(mut self, min: u8, max: u8) -> Self {
        self.min_brightness = min;
        self.max_brightness = max;
        self
    }
}

/// Rainbow pattern configuration.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct RainbowPattern {
    /// Speed of color cycling in milliseconds per hue step.
    pub speed_ms: u16,
    /// Whether to spread the rainbow across all LEDs (true) or cycle all together (false).
    pub spread: bool,
    /// Brightness level (0-255).
    pub brightness: u8,
}

impl RainbowPattern {
    /// Creates a new rainbow pattern.
    #[must_use]
    pub const fn new(speed_ms: u16) -> Self {
        Self {
            speed_ms,
            spread: true,
            brightness: 255,
        }
    }

    /// Sets unified rainbow (all LEDs same color).
    #[must_use]
    pub const fn unified(mut self) -> Self {
        self.spread = false;
        self
    }

    /// Sets the brightness level.
    #[must_use]
    pub const fn with_brightness(mut self, brightness: u8) -> Self {
        self.brightness = brightness;
        self
    }
}

/// Custom LED pattern with individual control.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LedPattern {
    /// Individual LED colors (12 LEDs per ring).
    pub leds: [RGB8; 12],
    /// Whether this pattern should loop/repeat.
    pub looping: bool,
}

impl LedPattern {
    /// Creates a new custom pattern with all LEDs off.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            leds: [RGB8::new(0, 0, 0); 12],
            looping: false,
        }
    }

    /// Creates a pattern from a slice of colors.
    ///
    /// # Panics
    ///
    /// Panics if the slice doesn't contain exactly 12 colors.
    #[must_use]
    pub fn from_colors(colors: &[RGB8]) -> Self {
        assert_eq!(colors.len(), 12, "LedPattern requires exactly 12 colors");
        let mut pattern = Self::new();
        for (i, &color) in colors.iter().enumerate() {
            pattern.leds[i] = color;
        }
        pattern
    }

    /// Enables looping for animated patterns.
    #[must_use]
    pub const fn with_loop(mut self) -> Self {
        self.looping = true;
        self
    }
}

impl Default for LedPattern {
    fn default() -> Self {
        Self::new()
    }
}

/// Predefined light patterns for common effects.
pub mod patterns {
    use super::{ChasePattern, LedPattern, Mode, PulsePattern, RainbowPattern};
    use smart_leds::RGB8;

    /// Police/emergency light pattern (red and blue).
    #[must_use]
    pub fn police() -> Mode {
        Mode::Chase(
            ChasePattern::new(RGB8::new(255, 0, 0), 6, 100).with_background(RGB8::new(0, 0, 255)),
        )
    }

    /// Soft breathing white light.
    #[must_use]
    pub fn breathing() -> Mode {
        Mode::Pulse(
            PulsePattern::new(RGB8::new(255, 255, 255), 3000).with_brightness_range(20, 255),
        )
    }

    /// Fast rainbow cycle.
    #[must_use]
    pub fn party() -> Mode {
        Mode::Rainbow(RainbowPattern::new(50))
    }

    /// Alert pattern (flashing red).
    #[must_use]
    pub fn alert() -> Mode {
        Mode::Pulse(PulsePattern::new(RGB8::new(255, 0, 0), 500))
    }

    /// Success pattern (green pulse).
    #[must_use]
    pub fn success() -> Mode {
        Mode::Pulse(PulsePattern::new(RGB8::new(0, 255, 0), 1000).with_brightness_range(50, 255))
    }

    /// Loading/thinking pattern (blue chase).
    #[must_use]
    pub fn loading() -> Mode {
        Mode::Chase(ChasePattern::new(RGB8::new(0, 100, 255), 3, 150))
    }

    /// Cat eyes pattern (two amber dots).
    #[must_use]
    pub fn cat_eyes() -> Mode {
        let mut pattern = LedPattern::new();
        // Position two "eyes" on opposite sides
        pattern.leds[0] = RGB8::new(255, 150, 0); // Amber
        pattern.leds[6] = RGB8::new(255, 150, 0); // Amber
        Mode::Custom(pattern)
    }

    /// Notification pattern (soft blue pulse).
    #[must_use]
    pub fn notification() -> Mode {
        Mode::Pulse(PulsePattern::new(RGB8::new(0, 150, 255), 2000).with_brightness_range(30, 200))
    }

    /// Fire effect (red-orange gradient).
    #[must_use]
    pub fn fire() -> Mode {
        Mode::Gradient(RGB8::new(255, 0, 0), RGB8::new(255, 150, 0))
    }

    /// Ocean effect (blue-cyan gradient).
    #[must_use]
    pub fn ocean() -> Mode {
        Mode::Gradient(RGB8::new(0, 0, 255), RGB8::new(0, 255, 255))
    }
}
