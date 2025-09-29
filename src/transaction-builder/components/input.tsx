import { Col, Form, InputGroup, Row } from "react-bootstrap";

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  label: string;
  controlId: string;
}

const Input = ({ value, onChange, placeholder = "", type = "text", label, controlId }: InputProps) => {
  return (
    <Row style={{ marginBottom: "20px" }}>
      <Col md={6}>
        <InputGroup>
          <InputGroup.Text style={{ marginRight: 10 }}>{label}</InputGroup.Text>
          <Form.Control type={type} placeholder={placeholder} value={value} onChange={onChange} id={controlId} />
        </InputGroup>
      </Col>
    </Row>
  );
};

export default Input;
