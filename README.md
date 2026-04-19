# My Video Call App

This repository showcases my journey as a solo developer focusing on learning **WebRTC** and **Socket.io** technologies. The goal of this project was to enhance my understanding of real-time communication and build a fully functioning video call application.

## Technologies Used
- **Node.js**: The server-side platform used to handle WebSocket connections and manage signaling for WebRTC.
- **React.js**: The front-end library for building the user interface, providing a responsive and dynamic user experience.
- **WebRTC**: The core technology enabling real-time audio and video communication between browsers.
- **Socket.io**: A library that simplifies WebSocket communication and aids in real-time event-driven programming.
- **JavaScript**: The programming language used for both client-side and server-side development of the application.

## Implementation Details
- **Server-side**: The backend is built using Node.js with Express, utilizing Socket.io for establishing and managing connections. It handles signaling messages between clients to initiate and control peer-to-peer WebRTC connections.
- **Client-side**: The React application uses hooks to manage the state of video streams and UI interactions. The Socket.io client is integrated to communicate with the backend to send and receive signaling messages.
- **WebRTC**: The application handles the complexities of peer connections, including NAT traversal, media streaming, and connection management, to facilitate direct communication between users.

## Features
- Real-time audio and video communication
- User-friendly interface
- Dynamic handling of media streams

## Deployed Frontend Site
You can access the live deployed application at: [Video Call App - Live Demo](https://videocallfrontend-1se9.onrender.com)

Experience the functionality firsthand and try the video calling features!

## Getting Started
To get a local copy up and running, follow these simple steps:

1. **Clone the Repo**:  
   ```bash
   git clone https://github.com/Abhishekpo/My-videocall-App.git
   ```

2. **Install Dependencies**:  
   Navigate to the project directory and install the necessary dependencies:
   ```bash
   cd My-videocall-App
   npm install
   ```

3. **Run the App**:  
   Start the development server:
   ```bash
   npm start
   ```

## License
Distributed under the MIT License. See `LICENSE` for more information.