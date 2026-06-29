const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/fpms').then(async () => {
  const r = await mongoose.connection.collection('motorstates').updateMany(
    {},
    { $set: { enabled: false, connectionActive: true } }
  );
  console.log('Reset', r.modifiedCount, 'motor doc(s) — enabled=false');
  mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
