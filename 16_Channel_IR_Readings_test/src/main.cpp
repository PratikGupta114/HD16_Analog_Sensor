#include <Arduino.h>

// Multiplexer Select Pins with colour of the wires connected to the CD4067 multiplexer
#define S0 3 // Brown
#define S1 4 // Orange
#define S2 5 // Purple
#define S3 2 // Yellow

// Multiplexer Analog Output Pin
#define MUX_OUT A6

// Number of channels on the multiplexer
#define NUM_CHANNELS 16

// Baud rate for serial communication
#define SERIAL_BAUD_RATE 115200

// Small delay for multiplexer to settle after channel selection (in microseconds)
#define MUX_SETTLE_DELAY_US 100

// Number of calibration samples to take per channel
#define NUM_CALIBRATION_SAMPLES 700

// Arrays to store calibration data
int minValues[NUM_CHANNELS], maxValues[NUM_CHANNELS], medianValues[NUM_CHANNELS];

/**
 * @brief Selects the active channel on the CD4067 multiplexer.
 * @param channel The channel number to select (0-15).
 */
void selectMuxChannel(byte channel)
{
  // S0 is LSB, S3 is MSB
  digitalWrite(S0, (channel & 0x01) ? HIGH : LOW); // bit 0
  digitalWrite(S1, (channel & 0x02) ? HIGH : LOW); // bit 1
  digitalWrite(S2, (channel & 0x04) ? HIGH : LOW); // bit 2
  digitalWrite(S3, (channel & 0x08) ? HIGH : LOW); // bit 3
  delayMicroseconds(MUX_SETTLE_DELAY_US);          // Allow multiplexer to settle
}

/**
 * @brief Performs sensor calibration to determine min, max, and median values for each channel.
 */
void calibrateSensors()
{
  Serial.println("Starting sensor calibration...");

  // Initialize min/max values for all channels
  for (int i = 0; i < NUM_CHANNELS; i++)
  {
    minValues[i] = 1023; // Initialize with maximum possible value
    maxValues[i] = 0;    // Initialize with minimum possible value
  }

  Serial.print("Taking ");
  Serial.print(NUM_CALIBRATION_SAMPLES);
  Serial.println(" samples across all channels...");
  delay(1000);

  // Take NUM_CALIBRATION_SAMPLES iterations, reading all channels in each iteration
  for (int i = 0; i < NUM_CALIBRATION_SAMPLES; i++)
  {
    // Read all channels for this sample iteration
    for (int j = 0; j < NUM_CHANNELS; j++)
    {
      selectMuxChannel(j);
      int reading = analogRead(MUX_OUT);

      // Update min/max for channel j
      if (reading < minValues[j])
        minValues[j] = reading;
      if (reading > maxValues[j])
        maxValues[j] = reading;
      // Optional: Add a small delay between reading channels in the same sample iteration
      delay(1);
    }
    // Optional: Add a delay between sample iterations
    delay(10);
  }

  // Calculate median (simple average of min/max) and print results after all samples are taken
  Serial.println("Calibration complete. Results:");
  Serial.println("-------------------");
  Serial.println("Channel\tMin Value\tMax Value\tMedian Value");
  Serial.println("-------------------");
  for (int i = 0; i < NUM_CHANNELS; i++)
  {
    medianValues[i] = (minValues[i] + maxValues[i]) / 2;
    Serial.print(i);
    Serial.print("\t");
    Serial.print(minValues[i]);
    Serial.print("\t");
    Serial.print(maxValues[i]);
    Serial.print("\t");
    Serial.println(medianValues[i]);
  }
}
void setup()
{
  // Initialize serial communication
  Serial.begin(SERIAL_BAUD_RATE);
  Serial.println("16 Channel IR Sensor Test with CD4067 Multiplexer");

  // Set select pins to OUTPUT mode
  pinMode(S0, OUTPUT);
  pinMode(S1, OUTPUT);
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);

  // MUX_OUT is an analog input, pinMode is not strictly necessary for analogRead,
  // but good practice. A6 and A7 on Nano are analog input only.
  // pinMode(MUX_OUT, INPUT);

  // Perform sensor calibration
  calibrateSensors();
  Serial.println("-------------------");
  Serial.println("Setup complete. Starting readings...");
  delay(1000); // Wait a second before starting readings
}

void loop()
{
  for (int i = 0; i < NUM_CHANNELS; i++)
  {
    selectMuxChannel(i);
    int sensorValue = analogRead(MUX_OUT);

    // Map the sensor reading from its calibrated range to 0-1023
    int mappedValue = map(sensorValue, minValues[i], maxValues[i], 0, 1023);

    // Constrain the mapped value to ensure it stays within 0-1023
    mappedValue = constrain(mappedValue, 0, 1023);

    Serial.print(mappedValue);
    Serial.print(" ");
  }
  Serial.println();
  // Serial.println("-------------------");
  delay(50); // Wait for 200 milliseconds before reading all channels again
}
