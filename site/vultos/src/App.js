import React, { useState } from 'react';
import Header from './components/Header';
import NavBar from './components/NavBar';
import MainContent from './components/MainContent';
import Footer from './components/Footer';
import './css/App.css';

function App() {
	const [darkMode, setDarkMode] = useState(true);

	const toggleDarkMode = () => {
		setDarkMode(!darkMode);
		document.body.classList.toggle('light-mode', !darkMode);
	};


	return (
		<div className={`App ${!darkMode ? 'light-mode' : ''}`}>
			<NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
			<Header />
			<MainContent />
			<Footer />
		</div>
	);
}

export default App;