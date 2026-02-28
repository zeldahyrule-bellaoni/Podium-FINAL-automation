module.exports = async function runPetTraining(page) {
  try {
    console.log("🐾 Opening Pets page...");
    await page.goto('https://v3.g.ladypopular.com/pets.php', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    // 🔍 STEP 1: Find active pet
    const activePet = await page.$('.pets-cars-wrapper.active-tab');
    if (!activePet) {
      console.log("❌ No active pet found. Skipping pet training.");
      return;
    }

    const petId = await activePet.getAttribute('id');
    const petIdNumber = petId.replace('pet', '');
    console.log(`🐶 Active pet detected. Pet ID: ${petIdNumber}`);

    // 🔍 STEP 2: Check cooldown (diamond bypass safety)
    const cooldownInfo = await activePet.evaluate(pet => {
      const button = pet.querySelector('#trainPet');
      const cooldownBar = pet.querySelector('#trainingCooldown');
      const timer = pet.querySelector('.timer-pet');

      return {
        onclick: button?.getAttribute('onclick') || '',
        buttonText: button?.innerText || '',
        cooldownWidth: cooldownBar?.style.width || '0%',
        timerText: timer?.innerText || ''
      };
    });

    const cooldownActive =
      cooldownInfo.onclick.includes('removeTrainingCooldown') ||
      cooldownInfo.buttonText.includes('Finish immediately') ||
      parseFloat(cooldownInfo.cooldownWidth) > 0 ||
      cooldownInfo.timerText.trim() !== '';

    if (cooldownActive) {
      console.log("⏳ Pet training cooldown active. Skipping to avoid diamonds.");
      return;
    }

    console.log("✅ No cooldown detected.");

    // 🔍 STEP 3: Get training cost (for logging only)
    const trainingCost = await activePet.evaluate(pet => {
      const btn = pet.querySelector('#trainPet');
      return btn ? parseInt(btn.dataset.price) : NaN;
    });

    if (!trainingCost || isNaN(trainingCost)) {
      console.log("❌ Could not determine training cost. Skipping.");
      return;
    }

    console.log(`💰 Training cost: ${trainingCost} dollars`);

    // 🚀 STEP 4: Train pet via internal request
    console.log("🎯 Training pet (internal request)...");

    const response = await page.evaluate(async petId => {
      const res = await fetch('/ajax/pets.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new URLSearchParams({
          type: 'trainLoyalty',
          pet_id: petId
        })
      });
      return res.json();
    }, petIdNumber);

    // ✅ STEP 5: Handle response
    if (response?.status === 1) {
      console.log("🎉 Pet trained successfully!");
      console.log(`📈 New Loyalty: ${response.info?.newLoyalty}`);
      console.log(`🔒 Cooldown started: ${response.info?.lockTime} seconds`);
    } else {
      console.log("⚠️ Pet training failed or was rejected.");
      console.log(response);
    }

  } catch (err) {
    console.log(`❌ Pet training script error: ${err.message}`);
    await page.screenshot({ path: 'pet-training-error.png', fullPage: true });
  }
};
