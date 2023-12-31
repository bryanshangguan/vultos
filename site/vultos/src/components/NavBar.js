import React from 'react';
import logo from '../logo.svg';
import '../css/NavBar.css';

function NavBar({ darkMode, toggleDarkMode }) {
    return (
        <nav className={`nav`}>
            <div className="logo-input-container">
                <img src={logo} alt="Logo" className="logo" />
                <span className="logo-text">vultos</span>
                <input
                    type="text"
                    placeholder="Search..."
                    className="search-input"
                />
            </div>
            <div className="right-container">
                <div className="buttons-container">
                    <button
                        onClick={() => window.location.href = '#documentation'}
                        className="button blue"
                    >
                        Documentation
                    </button>
                    <button
                        onClick={() => window.location.href = 'https://github.com/bryanshangguan/vultos.js'}
                        className="button gray"
                    >
                        GitHub
                    </button>
                </div>
                <label className="switch">
                    <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
                    <span className="slider round"></span>
                </label>
            </div>
        </nav>
    );
}

export default NavBar;