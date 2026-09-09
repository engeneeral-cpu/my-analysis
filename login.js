const $ = (id) => document.getElementById(id);
const tabs = document.querySelectorAll('.tab');
const modes = { otp: $('otpMode'), password: $('passwordMode'), passkey: $('passkeyMode') };
let timerId = null;
let seconds = 30;
let confirmationResult = null;
let recaptchaVerifier = null;
let firebaseReady = false;

function setStatus(message, good = true) {
  const el = $('status');
  if (!el) return;
  el.textContent = message || '';
  el.style.color = good ? '#72d7a5' : '#ff8f9a';
}

function digits(value) { return String(value || '').replace(/\D/g, '').slice(0, 10); }

function switchMode(mode) {
  Object.entries(modes).forEach(([key, el]) => el?.classList.toggle('hidden', key !== mode));
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  setStatus('');
}

tabs.forEach(tab => tab.addEventListener('click', () => switchMode(tab.dataset.mode)));
$('phone')?.addEventListener('input', e => { e.target.value = digits(e.target.value); });
$('loginPhone')?.addEventListener('input', e => { e.target.value = digits(e.target.value); });
$('otp')?.addEventListener('input', e => { e.target.value = digits(e.target.value).slice(0, 6); });

function startTimer() {
  clearInterval(timerId);
  seconds = 30;
  $('timer').textContent = '00:30';
  $('resendOtp').disabled = true;
  timerId = setInterval(() => {
    seconds -= 1;
    $('timer').textContent = `00:${String(seconds).padStart(2, '0')}`;
    if (seconds <= 0) {
      clearInterval(timerId);
      $('resendOtp').disabled = false;
      $('timer').textContent = 'Ready';
    }
  }, 1000);
}

function firebaseConfigured() {
  const c = window.AAROHI_FIREBASE_CONFIG || {};
  return Boolean(c.apiKey && !c.apiKey.startsWith('REPLACE_') && c.authDomain && c.projectId && c.appId);
}

function friendlyFirebaseError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-phone-number': 'That mobile number is invalid. Check the 10 digits.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again later.',
    'auth/quota-exceeded': 'SMS quota has been reached. Please try again later.',
    'auth/captcha-check-failed': 'Security check failed. Refresh the page and try again.',
    'auth/operation-not-allowed': 'Phone sign-in is not enabled in Firebase yet.',
    'auth/code-expired': 'This OTP expired. Request a new OTP.',
    'auth/invalid-verification-code': 'That OTP is incorrect. Check the code and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.'
  };
  return messages[code] || error?.message || 'Authentication failed. Please try again.';
}

function initFirebase() {
  if (!firebaseConfigured()) {
    setStatus('Firebase is not configured yet. Add the Firebase Web App settings first.', false);
    return false;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(window.AAROHI_FIREBASE_CONFIG);
    firebaseReady = true;
    return true;
  } catch (_) {
    setStatus('Firebase could not start. Check the Firebase configuration.', false);
    return false;
  }
}

function resetRecaptcha() {
  try { recaptchaVerifier?.clear(); } catch (_) {}
  recaptchaVerifier = null;
  if (!firebaseReady) return;
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    size: 'invisible',
    callback: () => {}
  });
}

async function sendOtp() {
  const phone = $('phone').value;
  if (!/^\d{10}$/.test(phone)) return setStatus('Enter a valid 10-digit mobile number.', false);
  if (!firebaseReady && !initFirebase()) return;
  $('sendOtp').disabled = true;
  setStatus('Sending secure OTP…');
  try {
    if (!recaptchaVerifier) resetRecaptcha();
    confirmationResult = await firebase.auth().signInWithPhoneNumber(`+91${phone}`, recaptchaVerifier);
    $('otpArea').classList.remove('hidden');
    startTimer();
    $('otp').focus();
    setStatus('OTP sent successfully. Check your phone.');
  } catch (error) {
    setStatus(friendlyFirebaseError(error), false);
    resetRecaptcha();
  } finally {
    $('sendOtp').disabled = false;
  }
}

async function verifyOtp() {
  const otp = $('otp').value.replace(/\D/g, '');
  if (!confirmationResult) return setStatus('Request an OTP first.', false);
  if (!/^\d{6}$/.test(otp)) return setStatus('Enter the 6-digit OTP.', false);
  $('verifyOtp').disabled = true;
  setStatus('Verifying OTP securely…');
  try {
    await confirmationResult.confirm(otp);
    setStatus('Phone verified successfully. Opening Aarohi…');
    setTimeout(() => { window.location.href = 'novaai.html'; }, 500);
  } catch (error) {
    setStatus(friendlyFirebaseError(error), false);
  } finally {
    $('verifyOtp').disabled = false;
  }
}

$('sendOtp')?.addEventListener('click', sendOtp);
$('resendOtp')?.addEventListener('click', sendOtp);
$('verifyOtp')?.addEventListener('click', verifyOtp);

$('passwordLogin')?.addEventListener('click', () => {
  const phone = $('loginPhone').value;
  if (!/^\d{10}$/.test(phone)) return setStatus('Enter a valid 10-digit mobile number.', false);
  setStatus('Password login will be enabled after the secure account service is connected.');
});

$('passkeyLogin')?.addEventListener('click', () => {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return setStatus('Passkeys are not available in this browser. Use Mobile + OTP.', false);
  }
  setStatus('Passkey support detected. Secure WebAuthn registration is the next authentication layer.');
});

$('forgotPassword')?.addEventListener('click', () => {
  switchMode('otp');
  setStatus('Use mobile OTP to begin secure account recovery.');
});

initFirebase();
