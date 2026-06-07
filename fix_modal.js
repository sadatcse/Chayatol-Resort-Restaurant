const fs = require('fs');

const customersPagePath = 'src/app/dashboard/customers/page.jsx';
const customerModalPath = 'src/components/CustomerModal.jsx';

const customersContent = fs.readFileSync(customersPagePath, 'utf8');

// The modal starts around line 600, let's find the exact block
const modalStartIndex = customersContent.indexOf('<dialog className="modal modal-open');
const modalEndIndex = customersContent.indexOf('</dialog>') + '</dialog>'.length;

const modalCode = customersContent.substring(modalStartIndex, modalEndIndex);

// Read the good part of CustomerModal.jsx
const modalFileContent = fs.readFileSync(customerModalPath, 'utf8');
const returnIndex = modalFileContent.indexOf('return (');

const goodPrefix = modalFileContent.substring(0, returnIndex + 'return (\n'.length);

const finalModalCode = goodPrefix + '    ' + modalCode.split('\n').join('\n    ') + '\n  );\n};\n\nexport default CustomerModal;';

// Write back to CustomerModal.jsx
fs.writeFileSync(customerModalPath, finalModalCode);
console.log('Fixed CustomerModal.jsx');
