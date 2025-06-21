const express = require("express");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./lib/db");
const Message = require("./models/Message");
const User = require("./models/User");

dotenv.config();
connectDB();

const app = express();
app.use(cors());

const server = app.listen(3001, () => {
  console.log("✅ Server running");
});

const wss = new WebSocketServer({ server });
const clients = new Map(); // socket -> { email, room }
const rooms = new Map();   // roomId -> Set<socket>

function getRoomId(email1, email2) {
  return [email1, email2].sort().join('+');
}

// Function to add contact to user's contact list
async function addContactToUser(userEmail, contactEmail) {
  try {
    console.log(`Attempting to add ${contactEmail} to ${userEmail}'s contacts`);
    
    // Get contact user details
    const contactUser = await User.findOne({ email: contactEmail }).select('name email image');
    console.log(`Contact user found:`, contactUser ? 'Yes' : 'No');
    
    // Prepare contact data
    const contactData = {
      email: contactEmail,
      name: contactUser?.name || contactEmail.split('@')[0],
      image: contactUser?.image || null,
      found: !!contactUser
    };

    // First, ensure the user exists and has a contacts array
    let user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log(`User ${userEmail} not found in database`);
      return false;
    }

    // Initialize contacts array if it doesn't exist
    if (!user.contacts) {
      console.log(`Initializing contacts array for ${userEmail}`);
      user.contacts = [];
      await user.save();
    }

    // Check if contact already exists
    const contactExists = user.contacts.some(contact => contact.email === contactEmail);
    if (contactExists) {
      console.log(`${contactEmail} already in ${userEmail}'s contacts`);
      return false; // Contact already exists
    }

    // Add to user's contacts
    const result = await User.findOneAndUpdate(
      { email: userEmail },
      { $push: { contacts: contactData } },
      { new: true }
    );
    
    if (result) {
      console.log(`Successfully added ${contactEmail} to ${userEmail}'s contacts`);
      return true; // Contact was added
    } else {
      console.log(`Failed to add ${contactEmail} to ${userEmail}'s contacts`);
      return false;
    }
  } catch (error) {
    console.error('Error adding contact:', error);
    return false;
  }
}

wss.on("connection", (socket) => {
  socket.on("message", async (data) => {
    try {
      const msg = JSON.parse(data);

      // STEP 1: Join Room
      if (msg.type === "join") {
        const { self, target } = msg;
        const roomId = getRoomId(self, target);
        clients.set(socket, { email: self, room: roomId });

        if (!rooms.has(roomId)) rooms.set(roomId, new Set());
        rooms.get(roomId).add(socket);

        console.log(`✅ ${self} joined ${roomId}`);

        // Send chat history
        const history = await Message.find({ roomId }).sort({ createdAt: 1 });
        socket.send(JSON.stringify({ type: 'history', messages: history }));
        return;
      }

      // STEP 2: Send message
      if (msg.type === "chat") {
        const client = clients.get(socket);
        const roomId = client.room;
        const sender = client.email;
        
        // Get target email from roomId
        const roomMembers = roomId.split('+');
        const target = roomMembers.find(email => email !== sender);

        console.log(`Processing message from ${sender} to ${target}`);

        // Add contacts to both users
        const senderContactAdded = await addContactToUser(sender, target);
        const receiverContactAdded = await addContactToUser(target, sender);

        // Save to DB
        const saved = await Message.create({
          roomId,
          from: client.email,
          text: msg.text,
        });

        const payload = JSON.stringify({
          type: "chat",
          from: client.email,
          text: msg.text,
          createdAt: saved.createdAt,
        });

        // Send message to all room members
        for (let member of rooms.get(roomId)) {
          member.send(payload);
        }

        // Send contact addition notifications
        if (senderContactAdded) {
          socket.send(JSON.stringify({
            type: 'contact_added',
            message: `${target} added to your contacts`
          }));
        }

        // Send notification to target if they're online
        if (receiverContactAdded) {
          for (let member of rooms.get(roomId)) {
            const memberInfo = clients.get(member);
            if (memberInfo && memberInfo.email === target) {
              member.send(JSON.stringify({
                type: 'contact_added',
                message: `${sender} added to your contacts`
              }));
              break;
            }
          }
        }
      }
    } catch (err) {
      console.error("❌ WS Error:", err);
    }
  });

  socket.on("close", () => {
    const info = clients.get(socket);
    if (info && rooms.has(info.room)) {
      rooms.get(info.room).delete(socket);
    }
    clients.delete(socket);
  });
}); 