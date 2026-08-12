/**
 * Global Jest Teardown — Runs ONCE after all test suites complete
 */
module.exports = async () => {
  const mongoServer = (global as any).__MONGOSERVER__;
  if (mongoServer) {
    await mongoServer.stop();
    console.log('\n✅ In-memory MongoDB stopped and cleaned up');
  }
};
