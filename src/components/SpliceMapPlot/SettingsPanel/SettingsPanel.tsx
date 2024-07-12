import React from "react"
import { Card, Form } from "react-bootstrap"

import "./SettingsPanel.css"

interface SettingsPanelProps {
  onPathogenGTFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onExpressionUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  fontSize: number
  onFontSizeChange: (value: number) => void
  width: number
  onWidthChange: (value: number) => void
  height: number
  onHeightChange: (value: number) => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  onPathogenGTFUpload,
  onExpressionUpload,
  fontSize,
  onFontSizeChange,
  width,
  onWidthChange,
  height,
  onHeightChange,
}) => {
  return (
    <div className="settings-panel">
      <Card className="settings-card">
        {" "}
        {/* Add a class for card styling */}
        <Card.Body className="settings-body">
          {" "}
          {/* Add a class for body styling */}
          <Card.Title className="settings-title">Settings</Card.Title>
          {/* Density and Genes Upload Section */}
          <Form>
            <Form.Group controlId="PathogenGtfUpload">
              <Form.Label>Pathogen GTF</Form.Label>
              <Form.Control type="file" onChange={onPathogenGTFUpload} />
            </Form.Group>

            <Form.Group controlId="ExpressionUpload">
              <Form.Label>Donor/Acceptor Expression</Form.Label>
              <Form.Control type="file" onChange={onExpressionUpload} />
            </Form.Group>

            {/* Font Size Section */}
            <Form.Group controlId="fontSize">
              <Form.Label>Font Size</Form.Label>
              <Form.Control
                type="number"
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
              />
            </Form.Group>

            {/* Width Adjustment Section */}
            <Form.Group controlId="width">
              <Form.Label>Width</Form.Label>
              <Form.Control
                type="number"
                value={width}
                onChange={(e) => onWidthChange(Number(e.target.value))}
              />
            </Form.Group>

            {/* Height Adjustment Section */}
            <Form.Group controlId="height">
              <Form.Label>Height</Form.Label>
              <Form.Control
                type="number"
                value={height}
                onChange={(e) => onHeightChange(Number(e.target.value))}
              />
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}

export default SettingsPanel
