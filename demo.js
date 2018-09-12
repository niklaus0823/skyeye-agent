let agent = require('./index');
agent.start('127.0.0.1', 8080, 'db3e1c6b');

function consume() {
  function fabonacci(n) {
    if (n === 0) {
      return 0;
    }
    if (n === 1) {
      return 1;
    }
    return fabonacci(n - 1) + fabonacci(n - 2);
  }

  const n = 40;
  const start = new Date();
  const result = fabonacci(n);
  const end = new Date();

  console.log('fabonacci(%d) = %d, time used: %d ms.', n, result, end.getTime() - start.getTime());
}

// consumption
setInterval(() => {
  consume();
}, 2000); // interval 5s
