module.exports = async function runBoyfriendKiss(page) {
  console.log("💋 BF Kiss: start");

  await page.goto('https://v3.g.ladypopular.com/myboy.php', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  const result = await page.evaluate(async () => {
    const res = await fetch('/ajax/boyfriend.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        type: 'performAction',
        actionName: 'kiss'
      }),
      credentials: 'same-origin'
    });

    return await res.json();
  });

  if (!result || typeof result !== 'object') {
    throw new Error('Invalid response from boyfriend API');
  }

  if (result.status === 1) {
    console.log("💋 BF Kiss: success");
  } else {
    console.log("💋 BF Kiss: cooldown / skipped");
  }
};
