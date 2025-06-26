# HD16 Analog Sensor Guide <img src="https://img.shields.io/badge/lastest_sensor_version-1.0-green">

This project provides a complete system for reading data from a 16-channel analog sensor using a compatible microcontroller (like ESP32, Arduino, STM32, etc.), sending the data to a Node.js backend, and visualizing it in real-time with a React-based web application.

## Hardware Compatibility

### Sensor Overview
- **Multiplexer**: CD4067 16-channel analog/digital multiplexer/demultiplexer
- **Sensors**: 16x TCRT5000 IR reflective sensors
- **Voltage Range**: 3V - 20V (CD4067), 3V - 5V (TCRT5000)

### Compatible Microcontrollers

| Microcontroller | Voltage | ADC Resolution | Notes |
|----------------|---------|----------------|-------|
| ESP32 | 3.3V | 12-bit | Built-in WiFi/BLE, recommended for wireless projects |
| ESP8266 | 3.3V | 10-bit | Built-in WiFi, good for basic applications |
| Arduino Uno | 5V | 10-bit | Classic choice, 5V logic **(Recommended)** |
| Arduino Nano | 5V | 10-bit | Compact form factor **(Recommended)** |
| Arduino Mega 2560 | 5V | 10-bit | More I/O pins **(Recommended)** |
| STM32 (Blue Pill) | 3.3V | 12-bit | High performance, ARM Cortex-M3 |
| Teensy 4.0/4.1 | 3.3V | 12-bit | High performance, ARM Cortex-M7 |
| Raspberry Pi Pico | 3.3V | 12-bit | Dual-core ARM Cortex-M0+ |
| ATmega328P | 5V | 10-bit | Used in Arduino Uno/Nano **(Recommended)** |
| ATMega8/16/32 Series | 5V | 10-bit | Popular 8-bit AVR MCUs **(Recommended)** |
| ATTiny Series | 3.3V/5V | 10-bit | Compact, low-power AVR MCUs **(Recommended)** |
| STM8 Series | 3.3V/5V | 10-bit | Cost-effective 8-bit MCUs **(Recommended)** |
| ESP32-S2/S3 | 3.3V | 12-bit | Improved ESP32 variants |

> **⚠️ Voltage Compatibility Warning:**
> *   **When powering sensors with 3.3V:** The setup is safe for both 3.3V and 5V microcontrollers, as the sensor's output signal will be within the safe limits for both.
> *   **When powering sensors with 5V:** The sensor's output will be approximately 5V. **Do not connect this directly to a 3.3V microcontroller's input pin** unless it is confirmed to be 5V tolerant. Doing so can permanently damage the microcontroller. Use a logic level shifter to safely interface 5V sensor outputs with 3.3V microcontrollers.

### ADC Configuration and Best Practices

For the most accurate and stable analog readings, consider the following recommendations:

*   **Voltage Reference (Vref)**:
    *   **Use a Stable Vref**: The accuracy of your ADC is directly tied to the stability of its voltage reference. Using the microcontroller's internal Vref is often more stable than relying on the main power supply (VCC), which can be noisy.
    *   **External Vref**: For high-precision applications, consider using a dedicated external voltage reference IC (e.g., TL431, LM4040). This provides the cleanest and most stable reference.

*   **Decoupling Capacitors**:
    *   **Analog VCC (AVCC)**: If your microcontroller has a separate analog power supply pin (AVCC), place a 100nF (0.1uF) ceramic capacitor as close to the pin as possible, connected to ground. This filters out high-frequency noise.
    *   **Vref Pin**: If you are using an external Vref or the internal Vref has a dedicated pin, place a similar 100nF capacitor on this pin to ground to ensure a stable reference voltage.

*   **Crystal Oscillators and ADC Sampling**:
    *   **Internal vs. External Oscillators**: Internal RC oscillators are convenient but can be less accurate and more susceptible to temperature and voltage variations than external crystal oscillators.
    *   **Impact on ADC Clock**: The ADC peripheral often uses the system clock, divided down, as its sampling clock. A stable system clock from an external crystal results in more consistent and predictable ADC sampling times, reducing jitter and improving accuracy, especially at higher sampling rates.
    *   **Recommendation**: For applications requiring high precision or consistent timing, **prefer microcontrollers with an external crystal oscillator**. While not strictly necessary for this project, it is a best practice for reliable analog measurements.

### Connection Guide

#### CD4067 Pinout:
```
S0-S3: Channel select (connect to MCU digital pins)
EN: Enable (active LOW, connect to GND to enable)
Common: Connect to MCU analog input
VCC: 3-20V (match MCU voltage)
GND: Ground
```

#### TCRT5000 Connection:
```
VCC: 3-5V (match MCU voltage)
GND: Ground
OUT: Connect to CD4067 channel input
```

## Project Structure

The repository is organized into three main components:

1.  `16_Channel_IR_Readings_test/`: A PlatformIO project for the ESP32 microcontroller. It reads analog sensor values and sends them over the serial port.
2.  `SensorVisualizer/sensor-backend/`: A Node.js (TypeScript) application that reads data from the serial port and broadcasts it over a WebSocket server.
3.  `SensorVisualizer/sensor-visualizer-app/`: A React application that connects to the WebSocket server and visualizes the incoming sensor data in real-time.

## Quickstart Guide

### 1. Hardware Setup

> **💡 Important Note for Best Results:**
> *   **Optimal Sensing Distance (Hf)**: For the most accurate readings, maintain a constant height of **2 mm** between the TCRT5000 sensor and the surface. The optimal sensing range is between **1 mm and 5 mm**.
> *   **Reliable Connections**: Ensure firm, stable connections between the sensors and the microcontroller. Fragile jumper wires can cause noise and unreliable readings. Soldered connections are recommended for permanent setups.

```
+----------------+      +----------------+      +----------------+
|  TCRT5000 x16  |      |    CD4067      |      |  Micro-       |
|                |      |   Multiplexer  |      |  controller   |
|  [Sensors]     |----->|  S0-S3: D2-D5  |----->|  D2-D5: S0-S3 |
|  OUT -> Ch0-15 |      |  SIG -> A0     |      |  A0   <- SIG  |
+----------------+      |  VCC -> 5V/3.3V|      |  GND   -> GND |
                        |  GND -> GND    |      +----------------+
                        +----------------+
```

### 2. Firmware: Auto-Calibration and Data Normalization

Before reading sensor values, the firmware performs a one-time auto-calibration routine. This is a crucial step to ensure data accuracy and consistency.

**How it Works:**
1.  **Data Collection:** On startup, the microcontroller takes **700** samples from each of the 16 sensors to establish a baseline.
2.  **Finding Extremes:** During this phase, it records the minimum (darkest) and maximum (lightest) reading for each individual sensor.
3.  **Min-Max Scaling:** After calibration, every new sensor reading is normalized using a technique called Min-Max Scaling. The raw value is mapped from its unique calibrated range `[min, max]` to a standardized range of `0-1023`.

**Why is this important?**
*   **Compensates for Sensor Variations:** No two TCRT5000 sensors are exactly alike. Calibration accounts for minor manufacturing differences.
*   **Adapts to Ambient Conditions:** It helps neutralize the effect of background lighting, leading to more reliable readings.
*   **Provides Consistent Output:** By scaling the output, the system ensures that a `0` truly represents the minimum reflection and `1023` represents the maximum, regardless of the raw values.

### 3. Basic Code Example (Arduino)

```cpp
#include <Arduino.h>

// Multiplexer Select Pins with color coding for wiring
#define S0 3  // Brown wire
#define S1 4  // Orange wire
#define S2 5  // Purple wire
#define S3 2  // Yellow wire

// Multiplexer Analog Output Pin
#define MUX_OUT A6

// Number of channels on the multiplexer
#define NUM_CHANNELS 16

// Baud rate for serial communication
#define SERIAL_BAUD_RATE 115200

// Delay for multiplexer to settle after channel selection (in microseconds)
#define MUX_SETTLE_DELAY_US 100

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

void setup()
{
  // Initialize serial communication
  Serial.begin(SERIAL_BAUD_RATE);
  
  // Set up multiplexer control pins as outputs
  pinMode(S0, OUTPUT);
  pinMode(S1, OUTPUT);
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);
  
  // Initialize all control pins to LOW
  digitalWrite(S0, LOW);
  digitalWrite(S1, LOW);
  digitalWrite(S2, LOW);
  digitalWrite(S3, LOW);
}

void loop()
{
  // Read all 16 channels and print values
  for (int i = 0; i < NUM_CHANNELS; i++)
  {
    selectMuxChannel(i);
    int sensorValue = analogRead(MUX_OUT);
    
    // Print the sensor reading with channel number
    Serial.print("Channel ");
    if (i < 10) Serial.print(" "); // Align single-digit numbers
    Serial.print(i);
    Serial.print(":\t");
    Serial.println(sensorValue);
    
    delay(50); // Short delay between channel reads
  }
  
  Serial.println("--------"); // Separator between scans
  delay(1000); // Delay between full channel scans
}
```

## Prerequisites

Before you begin, ensure you have the following software installed on your system.

### All Platforms (Windows, macOS, Linux)

*   **Git:** For cloning the repository. [Download Git](https://git-scm.com/downloads).
*   **Node.js:** Version 16.x or later. This includes `npm` (Node Package Manager). [Download Node.js](https://nodejs.org/).
*   **Visual Studio Code:** The recommended code editor. [Download VS Code](https://code.visualstudio.com/).
*   **PlatformIO IDE Extension:** For building and uploading the Arduino firmware. Install it from the Visual Studio Code Extensions marketplace.

### Platform-Specific Drivers

You may need to install drivers for your ESP32's USB-to-Serial chip. Common chips include:
*   **CP210x:** [Drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)
*   **CH340/CH341:** [Drivers](https://sparks.gogo.co.nz/ch340.html)

## Setup and Installation

Follow these steps to get the project running on your local machine.

### 1. Clone the Repository

Open your terminal or command prompt and run the following command:

```bash
git clone <YOUR_REPOSITORY_URL>
cd HD16_Analog_Sensor
```

### 2. Set Up the Microcontroller Firmware

1.  Open Visual Studio Code.
2.  Go to **File > Open Folder** and select the `16_Channel_IR_Readings_test` directory.
3.  PlatformIO will automatically detect the project.
4.  Connect your microcontroller board to your computer via USB.
5.  Build and upload the firmware by clicking the **PlatformIO: Upload** button (right-arrow icon) in the VS Code status bar at the bottom.

    *   **Note:** PlatformIO should auto-detect the serial port. If you encounter issues, you may need to specify the `upload_port` in the `platformio.ini` file. You can find the correct port name in the **PlatformIO: Devices** list.
    *   **For 5V microcontrollers:** Ensure the CD4067 VCC is connected to 5V
    *   **For 3.3V microcontrollers:** Connect CD4067 VCC to 3.3V for level compatibility

### 3. Set Up the Backend Server

1.  Open a new terminal window.
2.  Navigate to the backend directory:
    ```bash
    cd SensorVisualizer/sensor-backend
    ```
3.  Install the required dependencies:
    ```bash
    npm install
    ```
4.  Start the backend server:
    ```bash
    npm run dev
    ```

    *   **Note:** The server will attempt to connect to the ESP32's serial port. You may need to update the port name in the `src/index.ts` file to match your system's configuration. On Linux and macOS, you might need to grant your user serial port access (`sudo usermod -a -G dialout $USER`).

### 4. Set Up the Frontend Visualizer

1.  Open a third terminal window.
2.  Navigate to the frontend directory:
    ```bash
    cd SensorVisualizer/sensor-visualizer-app
    ```
3.  Install the required dependencies:
    ```bash
    npm install
    ```
4.  Start the React development server:
    ```bash
    npm run start
    ```

This will automatically open a new tab in your default web browser at `http://localhost:3000`. The application will connect to the backend WebSocket and begin displaying sensor data.

## Troubleshooting Common Setup Issues

If you encounter problems, here are some common issues and their solutions:

#### Backend (`sensor-backend`)

*   **Error: `Cannot find serial port` or `Permission denied`**
    *   **Solution 1:** Ensure your microcontroller is plugged into the computer.
    *   **Solution 2 (Linux):** You may need to grant your user permission to access serial ports. Run `sudo usermod -a -G dialout $USER`, then log out and log back in.
    *   **Solution 3:** Make sure no other program (like the Arduino IDE's Serial Monitor) is currently connected to the port.

*   **Error: `npm install` fails**
    *   **Solution:** Ensure you have a stable internet connection and that Node.js and npm are installed correctly. Try deleting the `node_modules` folder and the `package-lock.json` file, then run `npm install` again.

#### Frontend (`sensor-visualizer-app`)

*   **Problem: The visualizer shows "Disconnected" or no data appears.**
    *   **Solution 1:** Make sure the backend server is running **before** you start the frontend application.
    *   **Solution 2:** Verify the WebSocket URL in the React code matches the server's address (default is `ws://localhost:8080`).
    *   **Solution 3:** Open your browser's developer console (F12) and check for any WebSocket connection errors.

*   **Problem: `npm run start` fails or complains about a port being in use.**
    *   **Solution:** Another application is likely using port 3000. You can either close the other application or change the port for the React app.

## Usage

1.  Ensure the Microcontroller is programmed and connected to your computer.
2.  Run the backend server to establish a serial connection and start the WebSocket.
3.  Run the frontend application to view the data visualization.

## Datasheets and Resources

Here are some helpful resources for the components used in this project:

*   **TCRT5000/TCRT5000L Datasheet (Vishay)**: [Official Datasheet](https://www.vishay.com/docs/83760/tcrt5000.pdf)
*   **CD4067BE Datasheet (Texas Instruments)**: [Official Datasheet](https://www.alldatasheet.com/datasheet-pdf/pdf/157680/TI/CD4067BE.html)
*   **Interfacing CD74HC4067 with Arduino (ElectroPeak)**: [Tutorial](https://electropeak.com/learn/interfacing-cd74hc4067-16-channel-analog-digital-multiplexer-with-arduino/)
*   **Arduino Interfacing with CD74HC4067 (Instructables)**: [Tutorial](https://www.instructables.com/Arduino-Interfacing-With-CD74HC4067-16-channel-MUX/)
*   **CD74HC4067 Arduino Library and Code Examples (DeepBlue Embedded)**: [Tutorial](https://deepbluembedded.com/arduino-cd74hc4067-analog-multiplexer-library-code/)

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue to discuss proposed changes.

## About Hyper Drive Community

Hyper Drive is a community of like-minded robotics enthusiasts who aim to guide and motivate young engineers in building and breaking barriers to create new robots.

We as community organizers, offer guidance in building autonomous bots and resources, such as articles, discussions, and expert mentorship, to those struggling to make their robots work.

HyperDrive's philosophy is centered around the idea of technology as a sport. We aim to bring together a diverse community of innovators, engineers, inventors, enthusiasts, and competitors under one roof.

We are passionate about motivating young engineers to create new robots, break through barriers, and strive for excellence in competition.

Join us today and discover the endless possibilities of robotics. 
No prior experience is necessary, and we welcome all levels of enthusiasts who share our commitment to learning and enthusiasm for engineering. HyperDrive is an initiative to provide you with what we never had during our time, 
and we invite you to be part of this exciting journey.

<br/>

<div align="center">
    <img height="200" width="400" src="./Image_assets/join_group_meme.png" alt="Join our community meme"/>
    <p><em>Note: Please add the image file to the Image_assets directory</em></p>
</div>

<br/>

<div align="center">  
    <a href="https://t.me/hyperdrivehd">
        <img height="60" width="497" src="./Image_assets/join_hyperdrive_link_img.png" alt="Join HyperDrive Community"/>
    </a>
</div>
<br/>
<div align="center">  
    <a href="https://chat.whatsapp.com/C1yG8Cnh17Q1syhMYklgXb">
        <img height="60" width="497" src="./Image_assets/join_hyperdrive_whatsapp_link.png" alt="Join HyperDrive Community"/>
    </a>
</div>

## Author

<div align="center">
    <img height="150" width="431" src="./Image_assets/about_author.png" alt="About the author"/>
</div>

<br/>
<br/>
