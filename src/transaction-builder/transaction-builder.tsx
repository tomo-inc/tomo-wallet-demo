import { Col, Container, Row } from "react-bootstrap";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import EVM from "./components/evm";

import Solana from "./components/solana";
import Tron from "./components/tron";

/**
 * Swap Quotes Viewer Application
 *
 * This example demonstrates how to use the Tomo Wallet Business SDK to:
 * 1. Fetch swap quotes from multiple DEXes
 * 2. Build unsigned transactions for the best quote
 * 3. Handle ERC20 token approvals when required
 * 4. Send transactions via wagmi
 *
 * Workflow:
 * 1. User connects wallet
 * 2. User specifies token pair, amount and slippage
 * 3. Click "quote" to fetch available swap routes
 * 4. Click "builder" to generate transaction data
 * 5. If ERC20 token approval is needed, click "permitSign" first
 * 6. Click "Send" to execute the swap transaction
 *
 * Special Case for ERC20 Tokens:
 * When swapping from an ERC20 token, users may need to perform two transactions:
 * 1. First transaction: Token approval (permitSign) - grants permission to the DEX to spend user's tokens
 * 2. Second transaction: Actual swap - executes the token swap using the approved allowance
 * This two-step process is only required for a user's first interaction with a specific token/DEX pair.
 */

function TransactionBuilder() {
  return (
    <Container id="rootBuilder">
      <Row>
        <Col>
          <h1 className="text-primary">Swap Quotes Viewer</h1>
          <p className="text-muted">Fetch and display swap quotation information</p>
        </Col>
      </Row>

      <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example" className="mb-3">
        <Tab eventKey="evm" title="EVM" defaultChecked>
          <EVM />
        </Tab>
        <Tab eventKey="solana" title="Solana">
          <Solana />
        </Tab>
        <Tab eventKey="tron" title="Tron">
          <Tron />
        </Tab>
      </Tabs>
    </Container>
  );
}

export default TransactionBuilder;
