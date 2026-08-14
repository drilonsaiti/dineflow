# Printer bridge (reference implementation)

This is NOT part of the NestJS backend or Next.js frontend — it's a small,
separate always-on program you run on a computer on your venue's local
network (the same network as your thermal printer), because browsers and
cloud-hosted backends cannot open a raw socket to a printer's port 9100.

It receives the JSON ticket the backend POSTs to `printerBridgeUrl` and
translates it into ESC/POS commands using the `node-thermal-printer`
package, sent directly to the printer's IP.

## Setup

```bash
mkdir printer-bridge && cd printer-bridge
npm init -y
npm install express node-thermal-printer
```

## `index.js`

```js
const express = require('express');
const { printer: ThermalPrinter, types } = require('node-thermal-printer');

const app = express();
app.use(express.json());

const printer = new ThermalPrinter({
  type: types.EPSON, // or STAR, depending on your printer
  interface: 'tcp://192.168.1.100:9100', // your printer's actual IP
});

app.post('/', async (req, res) => {
  const { orderNumber, table, items } = req.body;
  printer.alignCenter();
  printer.bold(true);
  printer.println(`ORDER #${orderNumber}`);
  printer.bold(false);
  printer.println(table);
  printer.drawLine();
  printer.alignLeft();
  for (const item of items) {
    printer.println(`${item.quantity}x ${item.name}`);
    if (item.modifiers.length) printer.println(`  ${item.modifiers.join(', ')}`);
    if (item.note) printer.println(`  ** ${item.note}`);
  }
  printer.cut();

  try {
    await printer.execute();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(9100 + 1000, () => console.log('Printer bridge listening on :10100'));
```

Run it (`node index.js`) on a machine on the same network as the printer,
then set that machine's local IP + port as `printerBridgeUrl` in the
venue's Settings page (e.g. `http://192.168.1.50:10100`).