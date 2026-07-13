async function handleForgotPassword(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('forgotEmail');
  const statusBox = document.getElementById('forgotPasswordStatus');
  const button = document.getElementById('forgotPasswordBtn');

  const email = emailInput?.value?.trim() || '';

  if (!email) {
    if (statusBox) {
      statusBox.textContent = 'Please enter your email address.';
      statusBox.style.color = '#ef4444';
    }
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Sending...';
  }

  try {
    const response = await fetch('http://127.0.0.1:5001/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (statusBox) {
      statusBox.textContent = data.message || 'Please check your inbox.';
      statusBox.style.color = response.ok ? '#22c55e' : '#ef4444';
    }
  } catch (error) {
    console.error('Forgot password request failed:', error);
    if (statusBox) {
      statusBox.textContent = 'Something went wrong. Please try again later.';
      statusBox.style.color = '#ef4444';
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send Reset Link';
    }
  }
}

function attachForgotPasswordHandler() {
  const button = document.getElementById('forgotPasswordBtn');
  if (!button) return;
  button.removeEventListener('click', handleForgotPassword);
  button.addEventListener('click', handleForgotPassword);
}

attachForgotPasswordHandler();
