const fs = require('fs');

const path = 'src/app/dashboard/customers/page.jsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure import exists
if (!content.includes('import CustomerModal')) {
  content = content.replace(
    'import Pagination from "@/components/Comon/Pagination";',
    'import Pagination from "@/components/Comon/Pagination";\nimport CustomerModal from "@/components/CustomerModal";'
  );
}

const modalStartIndex = content.indexOf('{isModalOpen && (\n        <dialog className="modal modal-open');
if (modalStartIndex !== -1) {
  const modalEndIndex = content.indexOf('</dialog>\n      )}', modalStartIndex) + '</dialog>\n      )}'.length;
  
  const replacement = `{isModalOpen && (
        <CustomerModal 
          isOpen={isModalOpen}
          onClose={closeModal}
          customerToEdit={customers.find(c => c._id === editId)}
          onSuccess={loadCustomers}
        />
      )}`;
      
  content = content.substring(0, modalStartIndex) + replacement + content.substring(modalEndIndex);
}

fs.writeFileSync(path, content);
console.log('Fixed CustomersPage.jsx');
