import prisma from '../app/lib/prisma';
import bcrypt from 'bcrypt';

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@italydelivery.it';
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      console.error('ERROR: ADMIN_PASSWORD not set in .env file');
      console.log('\nPlease add to your .env file:');
      console.log('ADMIN_PASSWORD=your_secure_password_here');
      process.exit(1);
    }

    console.log('Creating Admin user...\n');

    // Verifica se esiste già
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('Admin user already exists!');
      console.log('Email:', email);
      console.log('\nIf you want to reset the password, delete the user first.');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea utente admin
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        confirmed: true,
        expired: false,
      }
    });

    console.log('Admin user created successfully!\n');
    console.log('='.repeat(50));
    console.log('ADMIN CREDENTIALS:');
    console.log('='.repeat(50));
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', admin.role);
    console.log('ID:', admin.id);
    console.log('='.repeat(50));
    console.log('\nYou can now login with these credentials.');
    console.log('\nLogin endpoint:');
    console.log('POST /api/v2/auth/login');
    console.log('Body: { "email": "' + email + '", "password": "' + password + '" }');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
