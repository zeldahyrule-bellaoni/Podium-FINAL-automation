module.exports = async function runGuildShow(page) {
  console.log("🎭 Opening Guild Show...");

  await page.goto('https://v3.g.ladypopular.com/guild_show.php', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Give map time to render
  await page.waitForTimeout(3000);

  // 1️⃣ Collect pending positions (only ones still visible in DOM)
  const pendingPositions = await page.$$eval(
    'map#Map area[rel]',
    areas => areas.map(a => a.getAttribute('rel'))
  );

  if (!pendingPositions.length) {
    console.log("✅ No pending guild show items found.");
    return;
  }

  // 2️⃣ Pick exactly ONE pending position
  const position = pendingPositions[0];
  console.log(`🧩 Pending position found: ${position}`);

  // 3️⃣ Fire the EXACT internal request you observed
  const response = await page.evaluate(async (position) => {
    const res = await fetch('/ajax/guilds.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        type: 'joinShow',
        position: position
      })
    });

    return res.json();
  }, position);

  // 4️⃣ Handle response safely
  if (response?.status === 1) {
    console.log(`✅ Successfully joined position ${position}`);
    console.log(`⏳ Cooldown left: ${response.details?.lady_cooldown_time_left}s`);
  } else {
    console.log(`⚠️ Join failed: ${response?.message ?? 'Unknown reason'}`);
  }
};
