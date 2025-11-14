// Test database setup for DOKU payment system
// Run with: node test-database-setup.js

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://wxanuptwbppxiesackyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4YW51cHR3YnBweWllc2Fja3l6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAzNzg4NywiZXhwIjoyMDc4NjEzODg3fQ.FS5fclQmArPCWJgOUTDpaLlRrmv48JZs35SdK1jtD0Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDatabaseSetup() {
  console.log('🔍 Testing DOKU Payment Database Setup\n');

  try {
    // Test 1: Check if payments table exists
    console.log('1. Testing payments table...');
    const { data: paymentsTable, error: paymentsError } = await supabase
      .from('payments')
      .select('id')
      .limit(1);

    if (paymentsError) {
      console.error('❌ Payments table error:', paymentsError.message);
      console.log('💡 Need to create payments table');
    } else {
      console.log('✅ Payments table exists');
      console.log(`   Sample record: ${paymentsTable?.length > 0 ? 'Found' : 'Empty'}`);
    }

    // Test 2: Check if doku_callbacks table exists
    console.log('\n2. Testing doku_callbacks table...');
    const { data: callbacksTable, error: callbacksError } = await supabase
      .from('doku_callbacks')
      .select('id')
      .limit(1);

    if (callbacksError) {
      console.error('❌ DOKU callbacks table error:', callbacksError.message);
      console.log('💡 Need to create doku_callbacks table');
    } else {
      console.log('✅ DOKU callbacks table exists');
      console.log(`   Sample record: ${callbacksTable?.length > 0 ? 'Found' : 'Empty'}`);
    }

    // Test 3: Check if invoices table exists and has required columns
    console.log('\n3. Testing invoices table...');
    const { data: invoicesTable, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, paid_at')
      .limit(1);

    if (invoicesError) {
      console.error('❌ Invoices table error:', invoicesError.message);
      console.log('💡 Need to check invoices table structure');
    } else {
      console.log('✅ Invoices table exists');
      console.log(`   Sample record: ${invoicesTable?.length > 0 ? 'Found' : 'Empty'}`);
    }

    // Test 4: Check invoice structure
    console.log('\n4. Testing invoice structure...');
    if (invoicesTable && invoicesTable.length > 0) {
      const sampleInvoice = invoicesTable[0];
      console.log('   Sample invoice fields:', Object.keys(sampleInvoice));

      const requiredFields = ['id', 'invoice_number', 'status'];
      const missingFields = requiredFields.filter(field => !(field in sampleInvoice));

      if (missingFields.length > 0) {
        console.log('⚠️  Missing fields:', missingFields);
      } else {
        console.log('✅ Required fields present');
      }
    }

    // Test 5: Try to insert a test payment record
    console.log('\n5. Testing payment record insertion...');
    const testPayment = {
      invoice_number: 'TEST-' + Date.now(),
      request_id: 'REQ-' + Date.now(),
      session_id: 'SESS-' + Date.now(),
      amount: 1000,
      payment_url: 'https://test.com',
      status: 'PENDING'
    };

    const { data: insertedPayment, error: insertError } = await supabase
      .from('payments')
      .insert(testPayment)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Payment insertion error:', insertError.message);
      console.log('💡 Check RLS policies or table structure');
    } else {
      console.log('✅ Payment record insertion successful');
      console.log(`   Inserted ID: ${insertedPayment.id}`);

      // Clean up test record
      await supabase
        .from('payments')
        .delete()
        .eq('id', insertedPayment.id);
      console.log('   ✅ Test record cleaned up');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('1. Run the SQL schema in database-schema.sql in Supabase');
  console.log('2. Check RLS policies allow the service role to access tables');
  console.log('3. Verify environment variables are correct');
  console.log('4. Test the payment flow after setup is complete');
}

// Test DOKU API connectivity
async function testDokuAPI() {
  console.log('\n🌐 Testing DOKU API Connectivity\n');

  const DOKU_CLIENT_ID = 'BRN-0271-1763046785718';
  const DOKU_SANDBOX_URL = 'https://api-sandbox.doku.com';

  try {
    // Test basic connectivity
    console.log('1. Testing DOKU sandbox connectivity...');
    const response = await fetch(`${DOKU_SANDBOX_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ DOKU API is reachable');
    } else {
      console.log('⚠️  DOKU API responded with:', response.status);
    }

  } catch (error) {
    console.error('❌ DOKU API connectivity failed:', error.message);
    console.log('💡 Check network or API endpoint');
  }
}

// Run tests
async function runTests() {
  await testDatabaseSetup();
  await testDokuAPI();
  console.log('\n🏁 Testing complete!');
}

runTests().catch(console.error);