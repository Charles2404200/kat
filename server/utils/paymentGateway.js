export async function mockPayment(amount, method) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ success: true, transactionId: `TXN-${Date.now()}` }), 1000);
  });
}
