// ======= KITCHEN & CHAT MANAGEMENT SERVICE =======
// This file handles kitchen notifications via Discord

// ======= CONFIGURATION =======
// Discord webhook URL for kitchen notifications
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1456589330930991135/bzRDBLYMVlg4J2JTHHeeokdai4g9ogDtDlsQlOfyEmwotdiKcCXs4qsuZcYT5PzAyeX1';

// ======= KITCHEN NOTIFICATION FUNCTIONS =======

// Main function to send kitchen notifications for restaurant items
function notifyKitchen(itemData, guestData, invoiceData) {
  console.log('🔔 Kitchen notification triggered');
  console.log('📊 Item data:', JSON.stringify(itemData));
  console.log('📊 Guest data:', JSON.stringify(guestData));
  
  try {
    // Check if item is Restaurant category and needs kitchen notification (Pending or Cancelled)
    if (itemData.category === 'Restaurant' && (!itemData.status || itemData.status === 'Pending' || itemData.status === 'Cancelled')) {
      console.log(`🍽️ Restaurant item with ${itemData.status || 'Pending'} status detected - sending to Discord kitchen channel`);
      sendDiscordKitchenMessage(itemData, guestData, invoiceData);
    } else if (itemData.category === 'Restaurant') {
      console.log(`ℹ️ Restaurant item status: ${itemData.status} - notification not needed`);
    } else {
      console.log('ℹ️ Non-restaurant item, skipping kitchen notification');
    }
  } catch (error) {
    console.error('❌ Error in kitchen notification:', error);
  }
}

// Send formatted message to Discord
function sendDiscordKitchenMessage(item, guest, invoice) {
  if (DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
    console.warn('⚠️ Discord webhook URL not configured yet');
    return;
  }
  
  try {
    // Generate unique order ID
    const orderId = generateKitchenOrderId();
    
    // Format current time
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Format room name (remove "with Mountain view" etc.)
    const cleanRoomName = guest.rooms ? guest.rooms.replace(/ with.*/i, '').trim() : 'N/A';
    
    // Determine message type and color based on status
    const status = item.status || 'Pending';
    let messageTitle, messageColor, footerText;
    
    if (status === 'Cancelled') {
      messageTitle = `❌ ORDER CANCELLED #${orderId}`;
      messageColor = 15158332; // Red color
      footerText = '⚠️ This order has been cancelled - please stop preparation';
    } else {
      messageTitle = `🍽️ NEW KITCHEN ORDER #${orderId}`;
      messageColor = 15158332; // Orange color
      footerText = 'React to update status: 👨‍🍳 Starting | ✅ Ready | 🚗 Delivered';
    }
    
    // Create Discord embed message
    const discordMessage = {
      content: `@everyone`, // Optional: ping everyone for urgent orders
      embeds: [{
        title: messageTitle,
        color: messageColor,
        fields: [
          {
            name: '📋 Item',
            value: `**${item.service}** x${item.quantity}`,
            inline: true
          },
          {
            name: '👤 Guest',
            value: guest.guestName,
            inline: true
          },
          {
            name: '🏠 Room',
            value: cleanRoomName,
            inline: true
          },
          {
            name: '🧾 Invoice',
            value: invoice.invoiceNumber,
            inline: true
          },
          {
            name: '⏰ Time',
            value: currentTime,
            inline: true
          },
          {
            name: '📊 Status',
            value: status,
            inline: true
          }
        ],
        footer: {
          text: footerText
        },
        timestamp: new Date().toISOString()
      }]
    };
    
    // Send to Discord
    const response = UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
      'method': 'POST',
      'contentType': 'application/json',
      'payload': JSON.stringify(discordMessage)
    });
    
    console.log('✅ Discord kitchen message sent successfully');
    console.log('📊 Response status:', response.getResponseCode());
    
    return { success: true, orderId: orderId };
    
  } catch (error) {
    console.error('❌ Failed to send Discord message:', error);
    return { success: false, error: error.message };
  }
}

// Generate unique kitchen order ID
function generateKitchenOrderId() {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits
  return `KO-${timestamp}`;
}

// ======= KITCHEN ORDER TRACKING =======
// Future: Track order status, timing, etc.

// Function to be called when saving invoice items
function processKitchenItems(invoiceData, guestData) {
  console.log('🔄 Processing kitchen items for invoice:', invoiceData.invoiceNumber);
  
  if (!invoiceData.items || invoiceData.items.length === 0) {
    console.log('ℹ️ No items to process');
    return;
  }
  
  // Process each item
  invoiceData.items.forEach((item, index) => {
    console.log(`📝 Processing item ${index + 1}:`, item.service);
    
    // Check if this is a Restaurant item that needs kitchen notification (Pending or Cancelled)
    if (item.category === 'Restaurant' && (!item.status || item.status === 'Pending' || item.status === 'Cancelled')) {
      console.log(`🍽️ Sending notification for ${item.status || 'Pending'} restaurant item`);
      notifyKitchen(item, guestData, invoiceData);
    } else if (item.category === 'Restaurant') {
      console.log(`ℹ️ Restaurant item status: ${item.status} - skipping notification`);
    }
  });
}

// ======= SETUP INSTRUCTIONS =======
/*
DISCORD SETUP STEPS:

1. Create Discord Server:
   - Open Discord (discord.com or app)
   - Click "+" to create server
   - Name it "Hotel Kitchen" or similar
   - Invite kitchen staff members

2. Create Kitchen Channel:
   - Right-click server name → Create Channel
   - Name: "kitchen-orders"
   - Type: Text Channel

3. Get Webhook URL:
   - Right-click #kitchen-orders channel
   - Click "Edit Channel"
   - Go to "Integrations" tab
   - Click "Create Webhook"
   - Name: "Invoice Orders"
   - Copy the webhook URL

4. Configure this file:
   - Replace DISCORD_WEBHOOK_URL with your actual URL
   - Test by running testKitchenNotification() function

5. Kitchen Staff Setup:
   - Download Discord app on phones
   - Join your server
   - Enable push notifications for the server
   - React to messages with 👨‍🍳 ✅ 🚗 for status updates
*/

// ======= TEST FUNCTIONS =======
function testKitchenNotification() {
  console.log('🧪 Testing Discord kitchen notification...');
  
  // Test data
  const testItem = {
    service: 'Chilly Chicken',
    category: 'Restaurant',
    room: '204 — Deluxe with Mountain view',
    quantity: 2,
    unitPrice: 200,
    total: 400,
    status: 'Pending'
  };
  
  const testGuest = {
    guestName: 'John Doe',
    rooms: '204 — Deluxe with Mountain view'
  };
  
  const testInvoice = {
    invoiceNumber: 'INV-2026-TEST',
    invoiceId: 'test-id'
  };
  
  notifyKitchen(testItem, testGuest, testInvoice);
}