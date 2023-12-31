import React from 'react';
import logo from '../logo.svg';

function Header() {
    return (
        <header>
            <img src={logo} alt="Logo" style={{ width: '50px' }} />
            <h1>Vultos.js Documentation</h1>
            <p>Explore the features and APIs of Vultos.js</p>
        </header>
    );
}

export default Header;
