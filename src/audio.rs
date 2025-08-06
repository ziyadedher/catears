//! Audio subsystem for embedded devices with support for tones, chiptunes, and raw audio playback.
//!
//! This module provides a comprehensive audio system designed for embedded devices, particularly those with limited
//! resources. It supports three main audio modes:
//!
//! - **Silent**: No audio output (default state)
//! - **Tone**: Simple single-frequency tone generation for basic beeps and alerts
//! - **Chiptune**: Retro-style music sequences composed of multiple notes, perfect for game sounds
//! - **Audio**: Raw PCM audio playback for pre-recorded sound effects and speech
//!
//! # Features
//!
//! - Fixed-size data structures suitable for `no_std` environments
//! - Predefined chiptune melodies for common game events (power-ups, game over, etc.)
//! - Support for 8-bit and 16-bit PCM audio in mono or stereo
//! - Looping support for both chiptunes and audio clips
//! - Volume control at both note and sequence levels
//!
//! # Examples
//!
//! ```rust,no_run
//! use catears::audio::{Mode, chiptunes, Note};
//!
//! // Play a simple tone
//! let beep = Mode::Tone(Note::new(440.0, 1000)); // A4 for 1 second
//!
//! // Play a predefined chiptune
//! let powerup = Mode::Chiptune(chiptunes::power_up());
//!
//! // Create a custom melody
//! let custom_melody = Mode::Chiptune(
//!     ChiptuneSequence::from_notes(&[
//!         Note::new(262.0, 250), // C4
//!         Note::new(330.0, 250), // E4
//!         Note::new(392.0, 500), // G4
//!     ])
//! );
//! ```
//!
//! # Audio File Preparation
//!
//! For raw audio clips, convert your audio files to uncompressed PCM format:
//!
//! ```bash
//! # Convert to 8-bit mono at 8kHz (recommended for embedded systems)
//! ffmpeg -i input.mp3 -f u8 -ar 8000 -ac 1 output.raw
//!
//! # Convert to 16-bit mono at 16kHz (higher quality)
//! ffmpeg -i input.mp3 -f s16le -ar 16000 -ac 1 output.raw
//! ```

use serde::{Deserialize, Serialize};

/// Audio playback modes for the speakers.
///
/// Defines the various audio output options available, from simple tone generation to complex chiptune melodies
/// commonly associated with retro gaming and electronics.
#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize, Deserialize)]
#[allow(clippy::large_enum_variant)]
pub enum Mode {
    /// No audio output (default state).
    #[default]
    Silent,

    /// Simple tone generation with configurable parameters.
    ///
    /// Generates a single note, either continuous or for a specified duration.
    Tone(Note),

    /// Chiptune sequence composed of multiple notes.
    ///
    /// Plays a sequence of notes, either custom or from predefined melodies.
    Chiptune(ChiptuneSequence),

    /// Raw audio playback from embedded audio data.
    ///
    /// Plays pre-recorded audio samples embedded in the binary.
    Audio(Clip),
}

/// Reference to embedded audio data.
///
/// Points to audio data that has been compiled into the binary using `include_bytes!`. For embedded systems, we use
/// raw PCM data for simplicity and performance.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Clip {
    /// Pointer to the start of the audio data.
    #[serde(skip)]
    pub data: &'static [u8],
    /// Sample rate in Hz (e.g., 8000, 16000, 22050).
    pub sample_rate: u32,
    /// Number of bits per sample (8 or 16).
    pub bits_per_sample: u8,
    /// Whether the audio is mono (false) or stereo (true).
    pub is_stereo: bool,
    /// Whether to loop the audio after completion.
    pub looping: bool,
}

impl Clip {
    /// Creates a new audio clip reference.
    #[must_use]
    pub const fn new(
        data: &'static [u8],
        sample_rate: u32,
        bits_per_sample: u8,
        is_stereo: bool,
    ) -> Self {
        Self {
            data,
            sample_rate,
            bits_per_sample,
            is_stereo,
            looping: false,
        }
    }

    /// Creates a new mono 8-bit audio clip (common for embedded systems).
    #[must_use]
    pub const fn mono_8bit(data: &'static [u8], sample_rate: u32) -> Self {
        Self::new(data, sample_rate, 8, false)
    }

    /// Creates a new mono 16-bit audio clip.
    #[must_use]
    pub const fn mono_16bit(data: &'static [u8], sample_rate: u32) -> Self {
        Self::new(data, sample_rate, 16, false)
    }

    /// Enables looping for the audio clip.
    #[must_use]
    pub const fn with_loop(mut self) -> Self {
        self.looping = true;
        self
    }

    /// Returns the number of samples in the audio clip.
    #[must_use]
    pub const fn sample_count(&self) -> u32 {
        let bytes_per_sample = (self.bits_per_sample / 8) as usize;
        let channels = if self.is_stereo { 2 } else { 1 };
        let count = self.data.len() / (bytes_per_sample * channels);
        assert!(count <= u32::MAX as usize, "Sample count exceeds u32::MAX");
        #[allow(clippy::cast_possible_truncation)]
        {
            count as u32
        }
    }

    /// Returns the duration of the audio clip in milliseconds.
    #[must_use]
    pub const fn duration_ms(&self) -> u32 {
        (self.sample_count() * 1000) / self.sample_rate
    }
}

/// A single note in a chiptune sequence.
///
/// Represents one note with its frequency, duration, and optional volume control.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Note {
    /// Frequency of the note in Hz (0.0 for rest/silence).
    pub frequency: f32,
    /// Duration of the note in milliseconds.
    pub duration_ms: u16,
    /// Volume level (0-255), or None to use the sequence's default volume.
    pub volume: Option<u8>,
}

impl Note {
    /// Creates a new note with the specified frequency and duration, using default volume.
    #[must_use]
    pub const fn new(frequency: f32, duration_ms: u16) -> Self {
        Self {
            frequency,
            duration_ms,
            volume: None,
        }
    }

    /// Creates a new note with specified frequency, duration, and volume.
    #[must_use]
    pub const fn with_volume(frequency: f32, duration_ms: u16, volume: u8) -> Self {
        Self {
            frequency,
            duration_ms,
            volume: Some(volume),
        }
    }

    /// Creates a rest (silence) for the specified duration.
    #[must_use]
    pub const fn rest(duration_ms: u16) -> Self {
        Self {
            frequency: 0.0,
            duration_ms,
            volume: None,
        }
    }
}

/// A sequence of notes forming a chiptune melody.
///
/// Can store up to 64 notes in a fixed-size array for embedded systems compatibility.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ChiptuneSequence {
    /// Array of notes in the sequence.
    #[serde(with = "serde_arrays")]
    pub notes: [Note; 64],
    /// Number of valid notes in the sequence (0-64).
    pub length: u8,
    /// Default volume for notes that don't specify their own volume.
    pub default_volume: u8,
    /// Whether to loop the sequence after completion.
    pub looping: bool,
}

impl ChiptuneSequence {
    /// Creates a new empty chiptune sequence.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            notes: [Note::rest(0); 64],
            length: 0,
            default_volume: 128,
            looping: false,
        }
    }

    /// Creates a new chiptune sequence from a slice of notes.
    ///
    /// # Panics
    ///
    /// Panics if the slice contains more than 64 notes.
    #[must_use]
    pub fn from_notes(notes: &[Note]) -> Self {
        assert!(
            notes.len() <= 64,
            "ChiptuneSequence can hold at most 64 notes"
        );
        let mut sequence = Self::new();
        for (i, note) in notes.iter().enumerate() {
            sequence.notes[i] = *note;
        }
        sequence.length = u8::try_from(notes.len()).expect("notes.len() should be <= 64");
        sequence
    }

    /// Sets the default volume for the sequence.
    #[must_use]
    pub const fn with_volume(mut self, volume: u8) -> Self {
        self.default_volume = volume;
        self
    }

    /// Enables looping for the sequence.
    #[must_use]
    pub const fn with_loop(mut self) -> Self {
        self.looping = true;
        self
    }
}

impl Default for ChiptuneSequence {
    fn default() -> Self {
        Self::new()
    }
}

/// Predefined chiptune melodies for common game events and UI feedback.
pub mod chiptunes {
    use super::{ChiptuneSequence, Note};

    /// Classic Mario-style coin collection sound.
    #[must_use]
    pub fn coin_collect() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(988.0, 100),  // B5
            Note::new(1319.0, 400), // E6
        ])
    }

    /// Power-up acquisition jingle.
    #[must_use]
    pub fn power_up() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(523.0, 100),  // C5
            Note::new(659.0, 100),  // E5
            Note::new(784.0, 100),  // G5
            Note::new(1047.0, 200), // C6
        ])
    }

    /// Level completion fanfare.
    #[must_use]
    pub fn level_complete() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(523.0, 150),  // C5
            Note::new(659.0, 150),  // E5
            Note::new(784.0, 150),  // G5
            Note::new(1047.0, 150), // C6
            Note::new(784.0, 150),  // G5
            Note::new(1047.0, 400), // C6
        ])
    }

    /// Game over melody.
    #[must_use]
    pub fn game_over() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(523.0, 200), // C5
            Note::new(494.0, 200), // B4
            Note::new(466.0, 200), // Bb4
            Note::new(440.0, 600), // A4
        ])
    }

    /// Menu selection beep.
    #[must_use]
    pub fn menu_select() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(1047.0, 50), // C6
            Note::new(1319.0, 50), // E6
        ])
    }

    /// Alert or notification chime.
    #[must_use]
    pub fn alert() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(880.0, 100), // A5
            Note::rest(50),
            Note::new(880.0, 100), // A5
        ])
    }

    /// Happy/cheerful melody for positive events.
    #[must_use]
    pub fn happy() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(523.0, 150),  // C5
            Note::new(659.0, 150),  // E5
            Note::new(784.0, 150),  // G5
            Note::new(659.0, 150),  // E5
            Note::new(1047.0, 300), // C6
        ])
    }

    /// Sad/minor key melody for negative events.
    #[must_use]
    pub fn sad() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(440.0, 300), // A4
            Note::new(415.0, 300), // Ab4
            Note::new(392.0, 300), // G4
            Note::new(349.0, 600), // F4
        ])
    }

    /// Boot-up sequence sound.
    #[must_use]
    pub fn startup() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(262.0, 100), // C4
            Note::new(392.0, 100), // G4
            Note::new(523.0, 100), // C5
            Note::new(659.0, 100), // E5
            Note::new(784.0, 200), // G5
        ])
    }

    /// Shutdown sequence sound.
    #[must_use]
    pub fn shutdown() -> ChiptuneSequence {
        ChiptuneSequence::from_notes(&[
            Note::new(784.0, 100), // G5
            Note::new(659.0, 100), // E5
            Note::new(523.0, 100), // C5
            Note::new(392.0, 100), // G4
            Note::new(262.0, 200), // C4
        ])
    }
}

/// Predefined audio clips embedded in the binary.
///
/// These audio clips are included at compile time using `include_bytes!` macro.For embedded systems, we use raw PCM format (uncompressed) for simplicity.
/// Convert audio files to raw PCM using tools like ffmpeg:
/// `ffmpeg -i input.mp3 -f u8 -ar 8000 -ac 1 output.raw`
pub mod clips {
    use super::Clip;

    // Example of how to embed audio files:
    // const MEOW_DATA: &[u8] = include_bytes!("../assets/meow.raw");
    // const PURR_DATA: &[u8] = include_bytes!("../assets/purr.raw");

    // Example audio clip functions:
    /*
    /// Cat meow sound effect.
    #[must_use]
    pub fn meow() -> Clip {
        Clip::mono_8bit(MEOW_DATA, 8000)
    }

    /// Cat purr sound effect (looped).
    #[must_use]
    pub fn purr() -> Clip {
        Clip::mono_8bit(PURR_DATA, 8000).with_loop()
    }
    */

    // Placeholder function until audio files are added
    /// Example audio clip (silent placeholder).
    #[must_use]
    pub fn example() -> Clip {
        // This is a placeholder - replace with actual audio data
        const SILENCE: &[u8] = &[128; 1000]; // 1000 samples of silence (8-bit centered at 128)
        Clip::mono_8bit(SILENCE, 8000)
    }
}
