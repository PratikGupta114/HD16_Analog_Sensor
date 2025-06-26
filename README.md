# HD16 Analog Sensor Visualizer

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
| Arduino Uno | 5V | 10-bit | Classic choice, 5V logic |
| Arduino Nano | 5V | 10-bit | Compact form factor |
| Arduino Mega 2560 | 5V | 10-bit | More I/O pins |
| STM32 (Blue Pill) | 3.3V | 12-bit | High performance, ARM Cortex-M3 |
| Teensy 4.0/4.1 | 3.3V | 12-bit | High performance, ARM Cortex-M7 |
| Raspberry Pi Pico | 3.3V | 12-bit | Dual-core ARM Cortex-M0+ |
| ATmega328P | 5V | 10-bit | Used in Arduino Uno/Nano |
| ESP32-S2/S3 | 3.3V | 12-bit | Improved ESP32 variants |

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

### 2. Basic Code Example (Arduino)

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

## Usage

1.  Ensure the ESP32 is programmed and connected to your computer.
2.  Run the backend server to establish a serial connection and start the WebSocket.
3.  Run the frontend application to view the data visualization.

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
