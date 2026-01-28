// rate-and-message-multiple-ladies.js
module.exports = async function runRateAndMessageMultipleLadies(page, tierConfigs) {

  // 🚨 CANONICAL EXCLUSION SET (LADY NAMES, case-insensitive)
  const excludedLadyNames = new Set([
    'Bella Swan','Veronica Park','smyle','Dee Dee Kelley','Indila','Zelda Hyrule','Her Majesty','Felis Felicitas','Wild Rose','Agent X','Giggles','Pania','Everest','RAMBØ XT',
    // add all names you want to exclude
  ].map(n => n.toLowerCase()));

  const m1 = 'Hello';
  const m2 = 'Hi'; //already won
  const m3 = 'Hi'; //168

  const tabLabel = page._guid || 'T?';

  let collectedLadies = [];

  await page.goto('https://v3.g.ladypopular.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  // ─────────────────────────────────────────────
  // 🔍 COLLECT LADIES
  // ─────────────────────────────────────────────
  for (const { tierId, startPage, endPage } of tierConfigs) {
    for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
      const ladiesOnPage = await page.evaluate(
        async ({ currentPage, tierId }) => {
          const res = await fetch('/ajax/ranking/players.php', {
            method: 'POST',
            body: new URLSearchParams({ action: 'getRanking', page: currentPage.toString(), tierId: tierId.toString() }),
            credentials: 'same-origin'
          });
          const data = await res.json();
          if (!data.html) return [];
          const container = document.createElement('div');
          container.innerHTML = data.html;
          const rows = container.querySelectorAll('tbody tr[id^="num"]');
          const results = [];
          rows.forEach(row => {
            const guildName = row.querySelector('.ranking-player-guild .player-guild-logo-name')?.textContent.trim();
            if (!guildName) return;

            const profileLink = row.querySelector('a[href*="ladygram.php"][href*="lady_id="]');
            if (!profileLink) return;
            const href = profileLink.getAttribute('href');
            const profileMatch = href.match(/lady_id=(\d+)/);
            if (!profileMatch) return;
            const profileId = profileMatch[1];

            const chatBtn = row.querySelector('button[onclick^="startPrivateChat"]');
            if (!chatBtn) return;
            const onclick = chatBtn.getAttribute('onclick') || '';
            const chatMatch = onclick.match(/startPrivateChat\((\d+),\s*'([^']+)'\)/);
            if (!chatMatch) return;
            const ladyId = chatMatch[1];
            const name = chatMatch[2];

            results.push({ profileId, ladyId, name });
          });
          if (!results.length) console.warn('⚠️ No ladies collected on page', currentPage, 'tier', tierId);
          return results;
        }, { currentPage, tierId }
      );

      collectedLadies.push(...ladiesOnPage);
      await page.waitForTimeout(700);
    }
  }

  // Remove duplicates
  const seenProfiles = new Set();
  collectedLadies = collectedLadies.filter(l => {
    if (seenProfiles.has(l.profileId)) return false;
    seenProfiles.add(l.profileId);
    return true;
  });

  // Early exclusion
  const excludedFound = collectedLadies.filter(l => excludedLadyNames.has(l.name.toLowerCase()));
  if (excludedFound.length > 0) {
    console.log('🚨🚨 EXCLUDED LADIES DETECTED 🚨🚨');
    excludedFound.forEach(l => console.log(`⛔ EXCLUDED: ${l.name} | ladyId=${l.ladyId} | profileId=${l.profileId}`));
  } else {
    console.log('✅ No excluded ladies detected automatically. Please manually cross-verify before continuing.');
  }
  console.log('⏸ Pausing for 30 seconds to allow manual cancellation...');
  await page.waitForTimeout(30 * 1000);

  const finalLadies = collectedLadies.filter(l => !excludedLadyNames.has(l.name.toLowerCase()));

  // ─────────────────────────────────────────────
  // 🔁 MAIN LOOP
  // ─────────────────────────────────────────────
  for (let i = 0; i < finalLadies.length; i++) {
    const { profileId, ladyId, name } = finalLadies[i];
    const url = `https://v3.g.ladypopular.com/profile.php?id=${profileId}`;

    let caseType = 'case1';
    let ratingResult = null;
    let ratingGiven = null;
    let messageResult = false;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.main-info .lady-name', { timeout: 15000 });

      // Determine case
      const starCount = await page.locator('.lg-profile-podium-rating-layout .ratings .star').count();
      if (starCount === 0) {
        caseType = 'case2'; // podium winner
      } else {
        const enabledStars = await page.locator('.lg-profile-podium-rating-layout .ratings .star:not(.disabled)').count();
        caseType = enabledStars > 0 ? 'case1' : 'case3';
      }

      // ✅ RATING
      if (caseType === 'case1') {
        try {
          const stars = await page.locator('.lg-profile-podium-rating-layout .ratings .star:not(.disabled)');
          const count = await stars.count();
          console.log(`DEBUG: Found ${count} clickable stars for ${name}`);
          if (count > 0) {
            await stars.nth(count - 1).click(); // click highest
            await page.waitForFunction(() => {
              const stars = document.querySelectorAll('.lg-profile-podium-rating-layout .ratings .star');
              return stars.length > 0 && [...stars].every(s => s.classList.contains('disabled'));
            }, { timeout: 8000 });
            ratingResult = true;
            ratingGiven = count;
          }
        } catch (e) {
          console.log('⚠️ Rating failed:', e);
          ratingResult = false;
        }
      }

      // ✅ MESSAGE
      const message = caseType === 'case1' ? m1 : caseType === 'case2' ? m2 : m3;

      try {
        await page.evaluate(({ ladyId, name }) => {
          startPrivateChat(ladyId, name);
        }, { ladyId, name });

        await page.waitForTimeout(1000); // give time for chat box
        await page.waitForSelector('#msgArea', { timeout: 10000 });

        await page.evaluate(msg => {
          const el = document.getElementById('msgArea');
          if (el) el.value = msg;
          const btn = document.getElementById('_sendMessageButton');
          if (btn) btn.click();
        }, message);

        messageResult = true;
      } catch (e) {
        console.log('⚠️ Messaging failed for', name, e);
        messageResult = false;
      }

    } catch (err) {
      console.log('⚠️ Profile load failed:', url, err);
    }

    const ratingEmoji = ratingResult === true ? `✅(${ratingGiven})` : ratingResult === false ? '❌' : '⚪️';
    const messageEmoji = messageResult ? '✅' : '❌';

    console.log(`${tabLabel} - (${i + 1}/${finalLadies.length}) ${url} | ${caseType} | ${ratingEmoji} ${messageEmoji}`);
  }

  console.log('🎉 TAB COMPLETED');
};
