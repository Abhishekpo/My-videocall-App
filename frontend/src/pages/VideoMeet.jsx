/**
 * 
 * In a video/audio call app, when a user joins, the app first establishes signaling using Socket.IO 
 * so peers can exchange connection data. Each user creates RTCPeerConnections and exchanges SDP offers/answers 
 * and ICE candidates to establish a direct peer-to-peer connection.

  Then, using browser APIs like getUserMedia, each user gets their local media stream (camera/mic) 
  and attaches it to the peer connections so others can receive it.

  When media changes—like toggling video/audio or starting screen share—the app replaces the 
  stream and sends new offers to renegotiate the connection.

  It also handles edge cases like media not being available or tracks ending, using fallback streams 
  and updating peers accordingly.

  So overall, Socket.IO handles signaling, WebRTC handles peer-to-peer connection, and browser APIs 
  provide media streams, while our code manages the flow and state.
 * 
 */

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
//import server from '../environment';

const server_url = "http://localhost:4000"; // this is signal server url, it can be same as server url of the app or different,
// but it should be running and should have socket.io server running on it

var connections = {}; // this object will hold all the peer connections, indexed by socket id of the peer
// the configuration for the peer connections, it can be STUN/TURN servers, but for simplicity we are using only STUN server here
/**
 * STUN servers are used to find the public IP address of the peer, and to establish a connection between peers that are behind NAT (Network Address Translation) or firewall.
 * TURN servers are used to relay the media traffic between peers when a direct connection cannot be established, such as when both peers are behind symmetric NATs or firewalls that block peer-to-peer connections.
 * In this configuration, we are using Google's public STUN server (stun.l.google.com:19302) to help establish peer-to-peer connections.
 *  This allows the application to work in most network environments without the need for a TURN server, which can be more complex and costly to set up.
 * lATTER IN THE CODE WE USE THIS new RTCPeerConnection(peerConfigConnections) will use this configuration to create a new peer connection for each peer that joins the call.
 * THIS TELLS webRTC to use the specified STUN server to help establish the connection between peers, which is essential for the video conferencing functionality to work properly,
 * especially in cases where peers are behind NATs or firewalls.
 */
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/**
 *
 * “useRef stores mutable values that persist across renders, don’t trigger re-renders,
 * and can be used to avoid stale closures in async callbacks.”
 */
export default function VideoMeetComponent() {
  var socketRef = useRef(); // this ref will hold the socket.IO connection to the signal server, we use useRef because we want to persist the socket connection across re-renders of the component without causing unnecessary re-renders when the socket connection changes.
  let socketIdRef = useRef(); // this ref will hold the socket id of the current peer, we use useRef for the same reason as socketRef, we want to persist the socket id across re-renders without causing unnecessary re-renders when the socket id changes.

  let localVideoref = useRef(); // this ref will hold the reference to the local video element, we use useRef because we want to access the video element directly to set the srcObject to the local media stream.

  let [videoAvailable, setVideoAvailable] = useState(true); // this state will hold the information about whether the video permission is granted or not, we use useState because we want to re-render the component when the video permission changes.

  let [audioAvailable, setAudioAvailable] = useState(true); // this state will hold the information about whether the audio permission is granted or not.

  let [screenAvailable, setScreenAvailable] = useState(); // this state will hold the information about whether the screen sharing permission is granted or not.

  let [video, setVideo] = useState(false); // this state will hold the information about whether the video is on or off, we use useState because we want to re-render the component when the video state changes.

  let [audio, setAudio] = useState(); // this state will hold the information about whether the audio is on or off, we use useState for the same reason as video.

  let [screen, setScreen] = useState(false); // this state will hold the information about whether the screen sharing is on or off, we use useState for the same reason as video and audio.

  let [showModal, setModal] = useState(true); // this state will hold the information about whether the chat modal is open or not.

  let [messages, setMessages] = useState([]); // this state will hold the list of chat messages.

  let [message, setMessage] = useState(""); // this state will hold the current message that the user is typing.

  let [newMessages, setNewMessages] = useState(3); // this state will hold the number of new messages that the user has received.

  let [askForUsername, setAskForUsername] = useState(true); // this state will hold the information about whether to ask the user for a username or not.

  let [username, setUsername] = useState("");

  const videoRef = useRef([]); // this ref will hold the list of video elements for the remote peers, we use useRef because we want to access the video elements directly to set the srcObject to the remote media streams,
  // and we want to persist the list of video elements across re-renders without causing unnecessary re-renders when the list of video elements changes.

  let [videos, setVideos] = useState([]);

  // TODO
  // if(isChrome() === false) {

  // }

  useEffect(() => {
    getPermissions();
  }, []);

  let getDislayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDislayMediaSuccess)
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    }
  };

  const getPermissions = async () => {
    try {
      // this function is called when the component mounts, it checks for the permissions for video, audio and screen sharing, and sets the state accordingly.
      //checks capabilities of the browser to access the user's media devices (camera and microphone) and screen sharing capabilities.
      const videoAvailable = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      if (videoAvailable) {
        setVideoAvailable(true);
        console.log("Video permission granted");
      } else {
        setVideoAvailable(false);
        console.log("Video permission denied");
      }
      // this function uses the navigator.mediaDevices.getUserMedia() method to request access to the user's media devices (camera and microphone).
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
        console.log("Audio permission granted");
      } else {
        setAudioAvailable(false);
        console.log("Audio permission denied");
      }
      // this function checks if the browser supports the getDisplayMedia API, which is used for screen sharing.
      //  If it is supported, it sets the screenAvailable state to true, otherwise it sets it to false.
      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        // If either video or audio permission is granted, it requests access to the user's media devices again, this time with the actual values of video and audio permissions.
        // If the user grants permission, it sets the local media stream to the userMediaStream variable and assigns it to the local video element's srcObject,
        // allowing the user to see their own video feed.
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });
        if (userMediaStream) {
          // assingning the local media stream to a global variable window.localStream,
          //  which can be accessed by other functions in the component to add the local stream to the peer connections and to manage the local media stream.
          window.localStream = userMediaStream;
          if (localVideoref.current) {
            // setting the srcObject of the local video element to the userMediaStream,
            // which allows the user to see their own video feed in the local video element.
            localVideoref.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
      console.log("SET STATE HAS ", video, audio);
    }
  }, [video, audio]);

  //2nd function that is called when the user clicks the "Connect" button after entering their username.
  // This function sets the video and audio states to the values of videoAvailable and audioAvailable,
  // which are determined by the getPermissions function.
  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  /**
   * Yes, every time you toggle camera or mic, getUserMedia() 
   * runs again and triggers getUserMediaSuccess() to update the stream and notify peers.
   * every time media changes, a new offer is sent to update peers, but the connection itself is not recreated.
   * getUserMediaSuccess(stream)

     - Called when browser returns a new media stream
     - Stop old stream → avoid multiple active tracks
    -  Save & show new stream locally
      - Add stream to all peer connections
    - Send new offers → update peers (renegotiation)

    - Attach track.onended:
    → if stream ends later, run fallback
    → stop tracks, set video/audio false
    → replace with black/silent stream
    → renegotiate again

     Key idea:
      New stream → replace old → update peers → handle end
   * 
   *
   */
  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        console.log(description);
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }
    /**
     * “If my current stream ends, replace it with a fake blank stream and tell everyone about the change.”
     * “The browser tracks the state of each media track, and when a track ends, it automatically triggers its onended handler.”
     * You:
        track.onended = handler
        Browser:
          when track ends → call handler
     */
    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoref.current.srcObject = window.localStream;

          for (let id in connections) {
            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        })
    );
  };
  /**
   * this is local function but, navigator.mediaDevices.getUserMedia() is browser Api built in
   * this function gets video // audio streams from the browser and pass it to getusermediaSuccess function
   */
  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio }) // this gives us streams here and run the getUsermediaSuccess functions
        .then(getUserMediaSuccess) // this handes the stream got from browser
        .catch((e) => console.log(e));
    } else {
      try {
        // this runs when user truns off the mic or camera
        let tracks = localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };
   /**
    * 
    * Same as getuserMediaSuccess but for videoSharing
    */
  let getDislayMediaSuccess = (stream) => {
    console.log("HERE");
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoref.current.srcObject = window.localStream;

          getUserMedia(); // now Screen sharing it over, go get my normal camera/mic stream again
        })
    );
  };
  /**
        * When I get a signal from another user:
          1. Make sure it is not from me
          2. If it contains SDP:
         - save the other user's call setup info
         - if they sent an offer:
         - generate my answer
         - save my answer
         - send my answer back
        3. If it contains ICE:
        - add that network candidate to the connection
        * 
        */
  let gotMessageFromServer = (fromId, message) => {
    // whenever the client receives a signaling message from the server, it calls this function with the socket ID of the sender (fromId) and the message itself (message).
    var signal = JSON.parse(message);

    /**
         * What each technology does (clear separation)
        WebRTC (browser API)

        Handles:

        .createOffer()
        .createAnswer()
        .setLocalDescription()
        .setRemoteDescription()
        .addIceCandidate()

         #SDP is a text description of how two peers should connect in WebRTC.
         #SDP = Session Description Protocol
         */

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        // if the signaling message contains an SDP (Session Description Protocol) offer or answer,
        // the client sets the remote description of the corresponding RTCPeerConnection to the received SDP.
        connections[fromId]
          // setting the remote description of the RTCPeerConnection to the received SDP, which contains information about the media capabilities and network configuration of the sender.
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            // If the received SDP is an offer, the client creates an answer, sets it as the local description,
            // and sends it back to the sender through the signaling server.
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer() // this generates an answer SDP based on the received offer SDP, which contains information about the media capabilities and network configuration of the client.
                .then((description) => {
                  connections[fromId]
                    // setting the local description of the RTCPeerConnection to the generated answer SDP, which is necessary for establishing the WebRTC connection with the sender.
                    .setLocalDescription(description)
                    .then(() => {
                      // sending the generated answer SDP back to the sender through the signaling server, allowing the sender to set it as the remote description and complete the WebRTC connection establishment process.
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            }
          })
          .catch((e) => console.log(e));
      }

      if (signal.ice) {
        // if the signaling message contains an ICE (Interactive Connectivity Establishment) candidate,
        // the client adds that candidate to the corresponding RTCPeerConnection.
        // adding the received ICE candidate to the RTCPeerConnection, which helps establish the peer-to-peer connection by providing information about the network candidates
        //  (IP addresses and ports) that can be used for communication between peers.
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false }); // no https
    // this connects to the socket.IO server at the specified URL, and establishes a WebSocket connection for real-time communication between the client and the server.

    socketRef.current.on("signal", gotMessageFromServer);
    // this sets up an event listener for the 'signal' event, which is emitted by the server when it receives a signaling message from another peer.
    // When the client receives a 'signal' event, it calls the gotMessageFromServer function, which processes the signaling message and establishes the WebRTC connection between peers.

    /**
     * When the client successfully connects to the socket.IO server,
     * it emits a 'join-call' event with the current URL (window.location.href) as data.
     * This informs the server that a new peer has joined the call and allows the server to manage the
     * list of connected peers and facilitate signaling between them.
     */
    socketRef.current.on("connect", () => { // this is called by Socket.io(client library running in the browser) not browser
      
      socketRef.current.emit("join-call", window.location.href); // get the url from browser global window object
       
      // After emitting the 'join-call' event, the client stores its own socket ID in the socketIdRef.current variable.
      // This allows the client to identify itself in future signaling messages and manage peer connections accordingly.
      socketIdRef.current = socketRef.current.id; // this sotres the socket id created by server and sent to it

      // The client also sets up an event listener for the 'chat-message' event, which is emitted by the server when a new chat message is received from another peer.
      socketRef.current.on("chat-message", addMessage);

      // The client sets up an event listener for the 'user-left' event, which is emitted by the server when a peer leaves the call.
      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });

      /**
       * The client sets up an event listener for the 'user-joined' event, which is emitted by the server when a new peer joins the call.
       * When a new peer joins, the server sends the list of all connected peers (including the new peer) to the client.
       * The client then iterates through this list and creates a new RTCPeerConnection for each peer, setting up event listeners for ICE candidates and remote streams.
       * The client also checks if the new peer is itself (by comparing the socket ID), and if so,
       * it adds the local media stream to all existing peer connections and creates an offer to establish the WebRTC connection with each peer.
       */
      socketRef.current.on("user-joined", (id, clients) => {

        clients.forEach((socketListId) => {
          // Create a new RTCPeerConnection for the new peer that joined the call, using the specified configuration (peerConfigConnections).
          if (socketListId === socketIdRef.current) {
            return;
          } 
          // if the socket ID in the list of clients matches the current peer's socket ID, it means that the new peer that joined is itself,
          // so we skip creating a new RTCPeerConnection for itself.

          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          // Set up an event listener for the 'icecandidate' event on the RTCPeerConnection, which is triggered when a new ICE candidate is generated.
          // When a new ICE candidate is generated, the client emits a 'signal' event to the server with the candidate information,
          // allowing the server to relay it to the appropriate peer for establishing the WebRTC connection.
          //event.candidate is the new ICE candidate that is generated by the browser, and it is sent to the server through the 'signal' event,
          // which allows the server to relay it to the appropriate peer for establishing the WebRTC connection.
          connections[socketListId].onicecandidate = function (event) {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          // Set up an event listener for the 'addstream' event on the RTCPeerConnection,
          //  which is triggered when a remote media stream is added to the connection.
          /**
           *  This means:

              connections[socketListId] = my WebRTC connection with one specific user
              onaddstream = event handler for when that user's media arrives
              event.stream = the remote user's media stream

             So this is basically:

              “If this connection starts receiving video/audio from this peer, update my UI.”
           * 
           */
          connections[socketListId].onaddstream = (event) => {
            console.log("BEFORE:", videoRef.current);
            console.log("FINDING ID: ", socketListId);

            // Check if a video element for the new peer already exists in the videoRef.current array,
            // which holds the list of video elements for remote peers.
            // becaue onaddstream (or ontrack) can fire multiple times for the SAME user, we need to check if we already have a video element
            // for that user before creating a new one.
            // we are seraching it in videoRef.current to find the video because videoRef.current is the source of truth for the list of video elements for remote peers,
            // and it is updated whenever a new video element is added or an existing one is updated.

            // we ae searching for the video in videoref instead of videos because videos might have stale closure values due to the asynchronous nature of state updates in React,
            // while videoRef.current always holds the latest value of the video elements,
            // allowing us to accurately check for the existence of a video element for the new peer.
            //
            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

            if (videoExists) {
              console.log("FOUND EXISTING");

              // Update the stream of the existing video
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.stream }
                    : video
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              // Create a new video
              console.log("CREATING NEW");
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoplay: true,
                playsinline: true,
              };
              /**
               * videoRef.current = updatedVideos;
               * “When updating state,
               * React gives the latest value via prev, but functions
               * created earlier may still use old values due to JavaScript closures.”
               */
              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };

          // Add the local video stream
          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            // we need this fall back becasue webrtc connections require a media stream to be added to them, even if it is a blank stream,
            // so if the user has not granted permission for video or audio, we add a blank stream to the connection to ensure that the WebRTC connection can be established properly.
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        }); // the forEach ends here, which means that the client has set up peer connections for all existing peers in the call,
        // and has added the local media stream to each connection.

        /**
         * After setting up the peer connections for all existing peers, the client checks if the new peer that joined is itself (by comparing the socket ID).
         * If the new peer is itself, it iterates through all existing peer connections and adds the local media stream to each connection.
         * Then, it creates an offer for each peer connection to establish the WebRTC connection with each existing peer, and emits a 'signal'
         * event to the server with the offer SDP (Session Description Protocol) for each peer.
         */
        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              // We attach the stream before creating the offer because the SDP is generated based on the attached media. seems redundant because we already added the stream in the forEach loop above,
              //  but we need to make sure that the stream is added to all connections before creating the offer,
              connections[id2].addStream(window.localStream);
            } catch (e) {}

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };
  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  let handleVideo = () => {
    setVideo(!video);
    // getUserMedia();
  };
  let handleAudio = () => {
    setAudio(!audio);
    // getUserMedia();
  };

  useEffect(() => {
  if (screen) {
    getDislayMedia();
  } else {
    getUserMedia();
  }
}, [screen]);

  let handleScreen = () => {
    setScreen(!screen);
  };

  let handleEndCall = () => {
    try {
      let tracks = localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      // 2. Close all peer connections
      for (let id in connections) {
      connections[id].close();
      }

      // 3. Disconnect socket
      socketRef.current.disconnect();

    } catch (e) {}
    window.location.href = "/";
  };

  let openChat = () => {
    setModal(true);
    setNewMessages(0);
  };
  let closeChat = () => {
    setModal(false);
  };
  let handleMessage = (e) => {
    setMessage(e.target.value);
  };

  // This function is called when a new chat message is received from another peer through the socket.IO server.
  // It takes the message data, the sender's username, and the socket ID of the sender as parameters.
  // The function updates the messages state by adding the new message to the existing list of messages.
  // If the socket ID of the sender is different from the current peer's socket ID,
  //  it also increments the newMessages state to indicate that there are new messages that the user has not seen yet.
  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  let sendMessage = () => {
    console.log(socketRef.current);
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
    // this.setState({ message: "", sender: username })
  };

  // This function is called when the user clicks the "Connect" button after entering their username.
  // It sets the askForUsername state to false, which hides the username input and shows the video conferencing interface.
  // Then, it calls the getMedia function to access the user's media devices (camera and microphone) and establish the WebRTC connection with other peers in the call.
  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  return (
    <div>
      {askForUsername === true ? (
        <div>
          <h2>Enter into Lobby </h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>

          <div>
            <video ref={localVideoref} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {showModal ? (
            <div className={styles.chatRoom}>
              <div className={styles.chatContainer}>
                <h1>Chat</h1>

                <div className={styles.chattingDisplay}>
                  {messages.length !== 0 ? (
                    messages.map((item, index) => {
                      console.log(messages);
                      return (
                        <div style={{ marginBottom: "20px" }} key={index}>
                          <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                          <p>{item.data}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p>No Messages Yet</p>
                  )}
                </div>

                <div className={styles.chattingArea}>
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    id="outlined-basic"
                    label="Enter Your chat"
                    variant="outlined"
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}

          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable === true ? (
              <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {screen === true ? (
                  <ScreenShareIcon />
                ) : (
                  <StopScreenShareIcon />
                )}
              </IconButton>
            ) : (
              <></>
            )}

            <Badge badgeContent={newMessages} max={999} color="orange">
              <IconButton
                onClick={() => setModal(!showModal)}
                style={{ color: "white" }}
              >
                <ChatIcon />{" "}
              </IconButton>
            </Badge>
          </div>

          <video
            className={styles.meetUserVideo}
            ref={localVideoref}
            autoPlay
            muted
          ></video>

          <div className={styles.conferenceView}>
            {videos.map((video) => (
              <div key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                ></video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
