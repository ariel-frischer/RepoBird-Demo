// Configure Mocha for BDD style
mocha.setup('bdd');

// Import the test file(s)
// We'll start with just spinning-cube.test.js
// Add more imports here as needed for other test files
import './spinning-cube.test.js';

// Run the tests after the window has loaded
window.addEventListener('load', () => {
  mocha.run();
});
