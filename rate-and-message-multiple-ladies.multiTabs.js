const runRateAndMessageMultipleLadiesMultiTabs =
  require('./rate-and-message-multiple-ladies.js');
const runMap = require('./run-map.js');

module.exports = async function runMultiTab(context) {
  console.log('🧵 Runner started');
  console.log('────────────────────────────────────────');

  /* ─────────────────────────────
     STEP 1: Read RUN_NUMBER from GAS
  ───────────────────────────── */
  const runNumber = Number(process.env.RUN_NUMBER);

  if (!runNumber || runNumber < 1 || runNumber > 18 || !runMap[runNumber]) {
    console.log('❌ Invalid or missing RUN_NUMBER');
    console.log(' Provided RUN_NUMBER:', process.env.RUN_NUMBER);
    console.log(' Expected: 1 to 18');
    console.log('🚪 Runner exiting safely');
    return;
  }

  console.log(`▶️ RUN_NUMBER received: ${runNumber}`);
  console.log('────────────────────────────────────────');

  /* ─────────────────────────────
     STEP 2: Get workloads for this run
  ───────────────────────────── */
  const workloads = runMap[runNumber];

  console.log(`🧵 Starting run ${runNumber}`);
  console.log(`🧵 Total tabs: ${workloads.length}`);
  console.log('📦 Workloads:', workloads);
  console.log('────────────────────────────────────────');

  /* ─────────────────────────────
     STEP 3: EXISTING 6-TAB LOGIC
     (UNCHANGED)
  ───────────────────────────── */
  const tabPromises = workloads.map(async (tierConfig, index) => {
    console.log(`🧵 Preparing Tab ${index + 1}`);
    console.log(` Tier config:`, tierConfig);

    const page = await context.newPage();
    console.log(`🧵 Tab ${index + 1} launched`);

    try {
      await runRateAndMessageMultipleLadiesMultiTabs(page, [tierConfig]);
      console.log(`✅ Tab ${index + 1} finished successfully`);
    } catch (err) {
      console.log(`❌ Tab ${index + 1} failed`);
      console.log(` Error: ${err.message}`);

      await page.screenshot({
        path: `multiTab-error-run-${runNumber}-tab-${index + 1}.png`,
        fullPage: true
      });

      console.log(`📸 Screenshot saved for Tab ${index + 1}`);
    }
  });

  console.log('⏳ Waiting for all tabs to complete...');
  await Promise.all(tabPromises);

  console.log('────────────────────────────────────────');
  console.log(`🎉 Run ${runNumber} completed`);
  console.log('🛑 Runner finished');
};
