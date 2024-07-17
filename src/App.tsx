// src/App.tsx
import "bootstrap/dist/css/bootstrap.min.css"
import React, { Suspense, lazy } from "react"
import { Spinner } from "react-bootstrap"
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom"

import "./App.css"
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary"
import Footer from "./components/Footer/Footer"
import Header from "./components/Header/Header"
import Home from "./components/Home/Home"

// Lazy load components
const ChimVizPlot = lazy(() => import("./components/ChimVizPlot/ChimVizPlot"))
const SpliceMapPlot = lazy(
  () => import("./components/SpliceMapPlot/SpliceMapPlot"),
)
const About = lazy(() => import("./components/About/About"))
const ContactUs = lazy(() => import("./components/ContactUs/ContactUs"))

const LoadingSpinner: React.FC = () => (
  <div className="loading">
    <Spinner animation="border" role="status">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  </div>
)

const App: React.FC = () => {
  return (
    <Router>
      <div className="App d-flex flex-column min-vh-100">
        <Header />
        <main className="flex-grow-1">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/chimviz" element={<ChimVizPlot />} />
                <Route path="/splicemap" element={<SpliceMapPlot />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/*" element={<Navigate to="/home" />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
