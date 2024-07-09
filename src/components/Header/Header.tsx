import React, { useState, useMemo, ChangeEvent } from 'react';
import { Container, Nav, Navbar, Modal, Button, Form } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';

import './Header.css';
import chess_logo from '../../public/chess.logo.png';
import ccb_logo from '../../public/ccb.logo.svg';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <Navbar bg="light" expand="lg" className="border-bottom">
        <Container className="d-flex justify-content-center">
          <Navbar.Brand href="/" className="d-flex align-items-center">
            <img src={chess_logo} style={{ height: '40px', marginRight: '15px' }} className="d-inline-block align-top" alt="Chess Logo" />
            <span className="d-none d-lg-inline">CHESS</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="/main" active={location.pathname === '/main'}>Home</Nav.Link>
              <Nav.Link href="/about" active={location.pathname === '/about'}>About</Nav.Link>
              <Nav.Link href="/contact" active={location.pathname === '/contact'}>Contact Us</Nav.Link>
            </Nav>
          </Navbar.Collapse>
          <Nav>
            <Nav.Link href="https://ccb.jhu.edu" className="d-flex align-items-center">
              <img src={ccb_logo} alt="CCB Logo" style={{ height: '40px', marginRight: '15px' }} />
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>
    </>
  );
};

export default React.memo(Header);
