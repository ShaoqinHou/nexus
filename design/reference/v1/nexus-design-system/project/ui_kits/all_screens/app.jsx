/* global React, DesignCanvas, DCSection, DCArtboard */
const { LoginScreen, TenantPicker, MenuManagement, Promotions, QRCodes, Staff, Settings, OrderConfirmation } = window.AllScreens;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="auth" title="Authentication & Tenant" subtitle="Login and multi-restaurant picker">
        <DCArtboard id="login" label="Sign In" width={960} height={640}><LoginScreen /></DCArtboard>
        <DCArtboard id="tenant" label="Choose Restaurant" width={960} height={640}><TenantPicker /></DCArtboard>
      </DCSection>
      <DCSection id="merchant" title="Merchant Screens" subtitle="Staff console surfaces">
        <DCArtboard id="menu" label="Menu Management" width={1200} height={780}><MenuManagement /></DCArtboard>
        <DCArtboard id="promotions" label="Promotions" width={1200} height={780}><Promotions /></DCArtboard>
        <DCArtboard id="qr" label="QR Codes" width={1200} height={780}><QRCodes /></DCArtboard>
        <DCArtboard id="staff" label="Staff" width={1200} height={680}><Staff /></DCArtboard>
        <DCArtboard id="settings" label="Settings · Appearance" width={1200} height={820}><Settings /></DCArtboard>
      </DCSection>
      <DCSection id="customer" title="Customer Screens" subtitle="Post-checkout">
        <DCArtboard id="confirmation" label="Order Confirmation" width={560} height={780}><OrderConfirmation /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
