import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/Landing';
import Authentication from './pages/authenticate';
import { AuthProvider } from './contexts/AuthContext';
import HomeComponent from './pages/home';
import History from './pages/history';
import VideoMeetComponent from './pages/VideoMeet';

function App() {
 // AuthProvider is a component that provides authentication context to its children components.
 //  It allows you to manage user authentication state and provide authentication-related functions 
 // (like login and register) to the components that need them. By wrapping your application in AuthProvider,
 //  you can easily access authentication data and functions from any component in the app using the useContext hook.
  return (
    <div className="App">

      <Router> 

        <AuthProvider>


          <Routes>

            <Route path='/' element={<LandingPage />} />

            <Route path='/auth' element={<Authentication />} />

            <Route path='/home's element={<HomeComponent />} />
            <Route path='/history' element={<History />} />
            <Route path='/:url' element={<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>

      </Router>
    </div>
  );
}

export default App;