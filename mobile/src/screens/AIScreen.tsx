import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { aiAPI } from '../services/api';
import { AIResponse } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AIScreenProps {
  navigation: any;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  persona?: string;
}

const AIScreen: React.FC<AIScreenProps> = ({ navigation }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Merhaba! FinBot AI asistanınızım. Size nasıl yardımcı olabilirim?',
      isUser: false,
      timestamp: new Date(),
      persona: 'assistant'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('general');
  const flatListRef = useRef<FlatList>(null);

  const personas = [
    { key: 'general', label: 'Genel', icon: 'chatbubble' },
    { key: 'accountant', label: 'Muhasebeci', icon: 'calculator' },
    { key: 'ceo', label: 'CEO', icon: 'business' },
    { key: 'investor', label: 'Yatırımcı', icon: 'trending-up' },
  ];

  const addMessage = (text: string, isUser: boolean, persona?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
      persona,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage(userMessage, true);

    try {
      setIsLoading(true);
      const response: AIResponse = await aiAPI.generateResponse(userMessage, selectedPersona);
      addMessage(response.response, false, response.persona || selectedPersona);
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', false);
    } finally {
      setIsLoading(false);
    }
  };

  const getPersonaIcon = (persona: string) => {
    const personaData = personas.find(p => p.key === persona);
    return personaData?.icon || 'chatbubble';
  };

  const getPersonaColor = (persona: string) => {
    switch (persona) {
      case 'accountant': return '#059669';
      case 'ceo': return '#3b82f6';
      case 'investor': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage
    ]}>
      {!item.isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons 
            name={getPersonaIcon(item.persona || 'general')} 
            size={20} 
            color="white" 
          />
        </View>
      )}
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.aiBubble
      ]}>
        {!item.isUser && item.persona && item.persona !== 'general' && (
          <Text style={styles.personaLabel}>
            {personas.find(p => p.key === item.persona)?.label}
          </Text>
        )}
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.aiMessageText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTime,
          item.isUser ? styles.userMessageTime : styles.aiMessageTime
        ]}>
          {item.timestamp.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );

  const renderPersonaSelector = () => (
    <View style={styles.personaContainer}>
      <Text style={styles.personaTitle}>AI Persona:</Text>
      <View style={styles.personaButtons}>
        {personas.map((persona) => (
          <TouchableOpacity
            key={persona.key}
            style={[
              styles.personaButton,
              selectedPersona === persona.key && styles.activePersonaButton,
            ]}
            onPress={() => setSelectedPersona(persona.key)}
          >
            <Ionicons 
              name={persona.icon as any} 
              size={16} 
              color={selectedPersona === persona.key ? 'white' : '#6b7280'} 
            />
            <Text style={[
              styles.personaButtonText,
              selectedPersona === persona.key && styles.activePersonaButtonText,
            ]}>
              {persona.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient colors={['#3b82f6', '#1e40af']} style={styles.header}>
        <Text style={styles.headerTitle}>AI Asistan</Text>
        <Text style={styles.headerSubtitle}>Finansal danışmanınız</Text>
      </LinearGradient>

      {/* Persona Selector */}
      {renderPersonaSelector()}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.disabledButton,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <Ionicons name="hourglass" size={20} color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  personaContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  personaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  personaButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  personaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  activePersonaButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  personaButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  activePersonaButtonText: {
    color: 'white',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  personaLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  aiMessageTime: {
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#1f2937',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});

export default AIScreen;
