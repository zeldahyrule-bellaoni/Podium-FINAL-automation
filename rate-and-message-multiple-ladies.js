// rate-and-message-multiple-ladies.js
module.exports = async function runRateAndMessageMultipleLadies(page, tierConfigs) {

  // 🚨 CANONICAL EXCLUSION SET (LADY NAMES, case-insensitive)
  const excludedLadyNames = new Set([
    'Bella Swan','Veronica Park','smyle','Dee Dee Kelley','Indila','Zelda Hyrule','Her Majesty','Sakura Haruno','Wild Rose','Agent X','Giggles','Pania','Everest','RAMBØ XT','Katniss Everdeen',
    'lady liz','Lotus','LXUU_ABDE','Queen Taylen','Natasha Romanoff','Jodza','Joselia','Astoria','уσυηg кιηg','Red Queen','Lady Penelope','Scarlet Timberlake','Ashley','AVA','MELODY','AjS_StYlE',
    'King Tyler','Nicole_Edgar','Jhosseline','Jewerline','Mpetty','nadia','Sara','Brianna','Jasmine','Natally','Лана','LaooyaA','Alexandra','Stefanie','katinka-jc','Gizem','Maya','Donna Rowe',
    'Artemisa','Miškica','Octavia','Lady Jamie','اماندا N','stef','Emma','Shiry','margo1726','Veronica','Aelin Galathynius','elegent julei','The Pirate','lady Sophia','Serena','liya','Cathexo',
    'Amelia Jacobs','Eman32','Kleophya','MistfulSky','Alira','AnnaRegina','Isabella','Athena','veronika','Chloe','Sylvia Lorena','Сензация','nade','denny','lady05','jood14','COCCOLE....',
    'Cayle','duushi','Louis','vicky','Hridita','хілларі','Alex','Анна','Lina','HOPE HOD KETER','НИЛО','Thynaël','Lana turner','Lamia','Elodeja','Kaoda Twinkle','Andreeasophia','Alexandra_Sunshine',
    'Anistemi','AitacJm','Abhigya','May Fernandes','LadyDeeDee','Cat Woman','Metal Princess','Queen of_girls','Ferozekhan.lover','Fenty','Annie','Harley Quinn','mykasa','Kahh','Auralis','melissa',
    'Renata','Athenaya','zani ali','tiki1','Mikasapisame','derya','Queen C','Αννα','Nesryn','Marki','FΣΛЯLΣSS','Didiqn','VALERIA','𝓐𝓷𝓷𝓪','Marina Fathy','azhar','Aurora','Katherine_Amara',
    'Anastassia','CharShawn','DOLCE MILK','darkknightfallen','Shenhe','Medyson',
    // add all names you want to exclude
  ].map(n => n.toLowerCase())); // convert to lowercase for case-insensitive matching

  const m1 = 'I am thankful that in a troubled world no calamity can prevent the return of spring - Helen Keller	🌿🌷	Wishing you a beautiful day!';
  const m2 = 'I am thankful that in a troubled world no calamity can prevent the return of spring - Helen Keller	🌿🌷	Wishing you a beautiful day!'; //already won
  const m3 = 'I am thankful that in a troubled world no calamity can prevent the return of spring - Helen Keller	🌿🌷	Wishing you a beautiful day!'; //168

  const tabLabel = page._guid || 'T?'; //internal tab label in playwright

  // now stores objects, not just profileIds
  let collectedLadies = []; //collects profileid, ladyid, name for each lady

  await page.goto('https://v3.g.ladypopular.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(2000);

  // ─────────────────────────────────────────────
  // 🔍 COLLECT LADIES (PROFILE + LADY ID + NAME)
  // ─────────────────────────────────────────────
  for (const { tierId, startPage, endPage } of tierConfigs) { 
    for (let currentPage = startPage; currentPage <= endPage; currentPage++) { //goes page by page inside each tier

      const ladiesOnPage = await page.evaluate(
        async ({ currentPage, tierId }) => {
          const res = await fetch('/ajax/ranking/players.php', {
            method: 'POST',
            body: new URLSearchParams({
              action: 'getRanking',
              page: currentPage.toString(),
              tierId: tierId.toString()
            }),
            credentials: 'same-origin'
          });

          const data = await res.json();
          if (!data.html) return [];

          const container = document.createElement('div');
          container.innerHTML = data.html;

          const rows = container.querySelectorAll('tbody tr[id^="num"]');
          const results = [];

          rows.forEach(row => {
            // guid check
            const guildName = row
            .querySelector('.ranking-player-guild .player-guild-logo-name')
            ?.textContent.trim();
            if (!guildName) return;

            //extracting profile URL
            const profileLink = row.querySelector('a[href*="ladygram.php"][href*="lady_id="]');
            if (!profileLink) return;

            const href = profileLink.getAttribute('href');
            const profileMatch = href.match(/lady_id=(\d+)/);
            if (!profileMatch) return;
            
            const profileId = profileMatch[1];

            // getting name and lady id from chat button
            const chatBtn = row.querySelector('button[onclick^="startPrivateChat"]');
            if (!chatBtn) return;

            const onclick = chatBtn.getAttribute('onclick') || '';
            const chatMatch = onclick.match(/startPrivateChat\((\d+),\s*'([^']+)'\)/);
            if (!chatMatch) return;

            const ladyId = chatMatch[1];
            const name = chatMatch[2];

            results.push({ profileId, ladyId, name });
          });
          
          // 🛡️ SAFETY NET
          if (!results.length) {
            console.warn('⚠️ No ladies collected on page',currentPage,'tier',tierId);
          }

          return results;
        },
        { currentPage, tierId }
      );

      collectedLadies.push(...ladiesOnPage);
      await page.waitForTimeout(700);
    }
  }

  // detects for duplicate entries based on profileId
  const seenProfiles = new Set();
  collectedLadies = collectedLadies.filter(l => {
    if (seenProfiles.has(l.profileId)) return false;
    seenProfiles.add(l.profileId);
    return true;
  });

  // ─────────────────────────────────────────────
  // 🚨 EARLY EXCLUSION (HARD SAFETY)
  // ─────────────────────────────────────────────
  const excludedFound = collectedLadies.filter(l =>
    excludedLadyNames.has(l.name.toLowerCase())
  );

  console.log('⏸ MANUAL VERIFICATION PAUSE INITIATED');

  if (excludedFound.length > 0) {
    console.log('🚨🚨 EXCLUDED LADIES DETECTED 🚨🚨');

    excludedFound.forEach(l => {
      console.log(
        `⛔ EXCLUDED: ${l.name} | ladyId=${l.ladyId} | profileId=${l.profileId}`
      );
    });
  } else {
    console.log('✅ No excluded ladies detected automatically. Please manually cross-verify before continuing.');
  }
  
  console.log('⏸ Pausing for 30 seconds to allow manual cancellation...');
  await page.waitForTimeout(5 * 1000); //30sec timeout
  
  const finalLadies = collectedLadies.filter(
    l => !excludedLadyNames.has(l.name.toLowerCase()) //removes excluded profiles
  );

  // ─────────────────────────────────────────────
  // 🔁 MAIN LOOP (UNCHANGED BEHAVIOUR)
  // ─────────────────────────────────────────────
  for (let i = 0; i < finalLadies.length; i++) {
    const { profileId, ladyId, name } = finalLadies[i];
    const url = `https://v3.g.ladypopular.com/ladygram.php?openprofile=true&game_id=int&lady_id=${ladyId}`;
    
    let caseType = 'case1';
    let ratingResult = null;
    let ratingGiven = null;
    let messageResult = false;
    let skipped = false;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector(
        '.main-info .lady-name',
        { timeout: 15000 }
      );
      
      // ⏳ allow rating widget to load
      await page.waitForTimeout(1200);

      //case determination
      const stars = page.locator('.lg-profile-podium-rating-layout .ratings .star');
      const starCount = await stars.count();
      if (starCount === 0) {
          caseType = 'case2'; // podium winner
      } else {
        const enabledStars = await page
        .locator('.lg-profile-podium-rating-layout .ratings .star:not(.disabled)')
        .count();
        if (enabledStars > 0) {
          caseType = 'case1'; // rateable
        } else {
          caseType = 'case3'; // already rated / other
        }
      }

      if (caseType === 'case1') {
        try {
          const stars = page.locator(
            '.lg-profile-podium-rating-layout .ratings .star:not(.disabled)'
          );
          
          const count = await stars.count();
          if (count > 0) {
            await stars.nth(count - 1).click(); // highest star
            
            // confirm success → all stars disabled
            await page.waitForFunction(() => {
              const stars = document.querySelectorAll(
                '.lg-profile-podium-rating-layout .ratings .star'
              );
              return stars.length > 0 &&
              [...stars].every(s => s.classList.contains('disabled'));
            }, { timeout: 8000 });
            
            ratingResult = true;
            ratingGiven = count;
          }
        } catch {
          ratingResult = false;
        }
      } //if loop ends here

      const message =
      caseType === 'case1' ? m1 :
      caseType === 'case2' ? m2 : m3;
      
      if (profileId && ladyId && name) {
        await page.evaluate(({ ladyId, name }) => {
          startPrivateChat(ladyId, name);
        }, { ladyId, name });
        
        try {
          await page.waitForSelector('#msgArea', { timeout: 7000 });
          await page.evaluate(msg => {
            document.getElementById('msgArea').value = msg;
            document.getElementById('_sendMessageButton').click();
          }, message);
          messageResult = true;
        } catch {
          messageResult = false;
        }
      } else {
        messageResult = false;
      }
    } catch {}

    const ratingEmoji =
      ratingResult === true ? `✅(${ratingGiven})` :
      ratingResult === false ? '❌' : '⚪️';

    const messageEmoji = messageResult ? '✅' : '❌';
    
    console.log(
      `${tabLabel} - (${i + 1}/${finalLadies.length}) ${url} | ${caseType} | ${ratingEmoji} ${messageEmoji}`
    );

  }

  console.log('🎉 TAB COMPLETED');
};
