# HD16 Analog Sensor Visualizer

This project provides a complete system for reading data from a 16-channel analog sensor using an ESP32, sending the data to a Node.js backend, and visualizing it in real-time with a React-based web application.

## Project Structure

The repository is organized into three main components:

1.  `16_Channel_IR_Readings_test/`: A PlatformIO project for the ESP32 microcontroller. It reads analog sensor values and sends them over the serial port.
2.  `SensorVisualizer/sensor-backend/`: A Node.js (TypeScript) application that reads data from the serial port and broadcasts it over a WebSocket server.
3.  `SensorVisualizer/sensor-visualizer-app/`: A React application that connects to the WebSocket server and visualizes the incoming sensor data in real-time.

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

### 2. Set Up the Arduino Firmware (ESP32)

1.  Open Visual Studio Code.
2.  Go to **File > Open Folder** and select the `16_Channel_IR_Readings_test` directory.
3.  PlatformIO will automatically detect the project.
4.  Connect your ESP32 board to your computer via USB.
5.  Build and upload the firmware by clicking the **PlatformIO: Upload** button (right-arrow icon) in the VS Code status bar at the bottom.

    *   **Note:** PlatformIO should auto-detect the serial port. If you encounter issues, you may need to specify the `upload_port` in the `platformio.ini` file. You can find the correct port name in the **PlatformIO: Devices** list.

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
    npm start
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
    npm start
    ```

This will automatically open a new tab in your default web browser at `http://localhost:3000`. The application will connect to the backend WebSocket and begin displaying sensor data.

## Usage

1.  Ensure the ESP32 is programmed and connected to your computer.
2.  Run the backend server to establish a serial connection and start the WebSocket.
3.  Run the frontend application to view the data visualization.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue to discuss proposed changes.
