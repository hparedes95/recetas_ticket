import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Subtitle, Card, AppButton, SectionTitle } from '../components/ui';
import { colors, spacing, font, radius } from '../theme';
import { useApp } from '../context/AppContext';
import { parseTicketText, SAMPLE_TICKET } from '../engine/ticketParser';
import { pickAndReadDocument } from '../engine/documentImport';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { Product } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AddTicketScreen() {
  const nav = useNavigation<Nav>();
  const { addProducts } = useApp();
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Product[] | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Necesitamos acceso para añadir la foto del ticket.');
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
      if (!result.canceled && result.assets?.[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Ups', 'No se pudo abrir la cámara o galería en este dispositivo.');
    }
  };

  const importDocument = async () => {
    try {
      setDocLoading(true);
      const result = await pickAndReadDocument();
      if (!result) return;
      if (result.hasText) {
        setText(result.text);
        const products = parseTicketText(result.text, 'documento');
        if (products.length > 0) {
          setParsed(products);
        } else {
          Alert.alert(
            'Documento leído',
            'Leí el documento pero no reconocí productos. Revisa el texto de abajo y pulsa "Analizar ticket".',
          );
        }
      } else {
        Alert.alert(
          'No pude leer el documento',
          'Puede que sea un PDF escaneado (una imagen). Prueba con una foto, o escribe/pega el contenido a mano.',
        );
      }
    } catch (e) {
      Alert.alert('Ups', 'No se pudo abrir o leer el documento.');
    } finally {
      setDocLoading(false);
    }
  };

  const analyze = () => {
    const products = parseTicketText(text, imageUri ? 'foto' : 'manual');
    if (products.length === 0) {
      Alert.alert(
        'No reconocí productos',
        'Escribe o pega el contenido del ticket, un producto por línea. También puedes probar con el ejemplo.',
      );
      return;
    }
    setParsed(products);
  };

  const confirm = () => {
    if (!parsed) return;
    addProducts(parsed);
    Alert.alert('¡Listo!', `Se añadieron ${parsed.length} productos a tu despensa.`, [
      { text: 'Genial', onPress: () => nav.navigate('Main', { screen: 'Despensa' }) },
    ]);
  };

  const removeFromParsed = (id: string) =>
    setParsed((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));

  return (
    <Screen scroll edges={['bottom']}>
      <Title>Añadir ticket</Title>
      <Subtitle>
        Sube el ticket como documento (PDF, TXT…), hazle una foto, o escribe/pega su contenido.
        Reconoceremos los ingredientes automáticamente.
      </Subtitle>

      <SectionTitle>1. Documento o foto (opcional)</SectionTitle>
      <AppButton
        title={docLoading ? 'Leyendo documento…' : 'Subir documento (PDF, TXT…)'}
        icon="📄"
        loading={docLoading}
        onPress={importDocument}
      />
      <View style={{ height: spacing.sm }} />
      <View style={styles.photoRow}>
        <AppButton title="Cámara" icon="📷" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => pickImage(true)} />
        <AppButton title="Galería" icon="🖼️" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => pickImage(false)} />
      </View>
      {imageUri ? (
        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          <Text style={styles.imageHint}>
            📝 De momento, copia debajo lo que ponga el ticket (el reconocimiento automático de la
            foto llegará pronto).
          </Text>
        </View>
      ) : null}

      <SectionTitle
        right={
          <Pressable onPress={() => setText(SAMPLE_TICKET)}>
            <Text style={styles.link}>Usar ejemplo</Text>
          </Pressable>
        }
      >
        2. Contenido del ticket
      </SectionTitle>
      <TextInput
        style={styles.textArea}
        multiline
        placeholder={'Pechuga de pollo 500g\nArroz 1kg\nTomate\nYogur griego\n...'}
        placeholderTextColor={colors.textFaint}
        value={text}
        onChangeText={setText}
      />

      <View style={{ height: spacing.md }} />
      <AppButton title="Analizar ticket" icon="🔍" onPress={analyze} />

      {parsed ? (
        <>
          <SectionTitle>Productos reconocidos ({parsed.length})</SectionTitle>
          <Card>
            {parsed.map((p) => {
              const def = INGREDIENT_BY_KEY[p.ingredientKey];
              return (
                <View key={p.id} style={styles.parsedRow}>
                  <Text style={styles.parsedEmoji}>{def?.emoji ?? '🛒'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.parsedName}>{p.displayName}</Text>
                    <Text style={styles.parsedRaw} numberOfLines={1}>
                      {p.raw}
                    </Text>
                  </View>
                  <Pressable hitSlop={10} onPress={() => removeFromParsed(p.id)}>
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
          <View style={{ height: spacing.md }} />
          <AppButton title={`Añadir ${parsed.length} productos a la despensa`} icon="✅" onPress={confirm} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  imageWrap: { marginTop: spacing.md },
  image: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.cardAlt },
  imageHint: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  link: { color: colors.primary, fontWeight: font.weight.bold, fontSize: font.size.sm },
  textArea: {
    minHeight: 150,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    fontSize: font.size.md,
    color: colors.text,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  parsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  parsedEmoji: { fontSize: 24 },
  parsedName: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  parsedRaw: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 1 },
  remove: { fontSize: font.size.lg, color: colors.textFaint, paddingHorizontal: spacing.sm },
});
