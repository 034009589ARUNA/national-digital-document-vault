# Sierra Vault - Blockchain-Verified Digital Document Vault

A secure, blockchain-verified digital vault system for Sierra Leone citizens to store and manage their official documents. Inspired by DigiLocker (India), this system provides tamper-proof storage for important documents like birth certificates, property deeds, and educational degrees.

## Features

- 🔐 **Secure Authentication** - User registration and login with JWT tokens
- 📄 **Document Upload** - Upload and store important documents securely
- 🔗 **Blockchain Verification** - Each document is verified and stored on blockchain for tamper-proof integrity
- 📱 **Modern UI** - Clean, intuitive interface similar to DigiLocker
- 🔍 **Document Management** - View, download, and verify your documents
- 🌍 **Sierra Leone Focused** - Customized for Sierra Leone citizens and document types

## Tech Stack

### Frontend
- Next.js 14 (React)
- Tailwind CSS
- Framer Motion (animations)
- Axios (API calls)

### Backend
- Node.js + Express
- MongoDB (document metadata)
- IPFS (decentralized file storage)
- Blockchain verification (Ethereum-compatible)

## Installation

1. **Install all dependencies:**
```bash
npm run install:all
```

2. **Set up environment variables:**

Create `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sierra-vault
JWT_SECRET=your-secret-key-change-in-production
IPFS_API_URL=http://localhost:5001
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

3. **Start the development servers:**
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` and backend on `http://localhost:5000`

## Project Structure

```
sierra-vault/
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   └── public/       # Static assets
├── backend/          # Express backend API
│   ├── routes/       # API routes
│   ├── models/       # Database models
│   ├── middleware/   # Custom middleware
│   └── blockchain/   # Blockchain verification logic
└── README.md
```

## Usage

1. **Register** - Create an account with your National ID Number (NIN)
2. **Upload Documents** - Upload your important documents (birth certificates, degrees, property deeds)
3. **Verify** - Documents are automatically verified and stored on blockchain
4. **Access** - Access your documents anytime, anywhere securely

## Document Types Supported

- Birth Certificates
- National ID Cards
- Property Deeds/Land Titles
- Educational Certificates/Degrees
- Driver's Licenses
- Marriage Certificates
- Business Licenses
- And more...

## Security Features

- Blockchain-based tamper-proof storage
- Encrypted file storage
- JWT-based authentication
- Secure document verification
- Audit trail for all document operations

## Hackathon Notes

This system is designed for hackathon competition and includes:
- Modern, professional UI
- Full-stack implementation
- Blockchain integration
- Scalable architecture
- Customizable for Sierra Leone context

## Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[HACKATHON.md](./HACKATHON.md)** - Presentation guide for hackathon

## Quick Start

```bash
# 1. Install dependencies
npm run install:all

# 2. Set up MongoDB (local or Atlas)
# Create backend/.env file (see SETUP.md)

# 3. Start development servers
npm run dev

# 4. Open http://localhost:3000
```

## License

MIT License - Feel free to customize for your needs!

