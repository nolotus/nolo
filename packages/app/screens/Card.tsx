import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

// import Avatar from "../../ui/screens/Avatar";
const Card = ({
  id,
  title,
  imageUri,
  userName,
  avatarUri,
}: {
  id: string;
  title: string;
  imageUri: string;
  userName?: string;
  avatarUri?: string;
}) => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => {
        navigation.navigate("SurfSpot", { id });
      }}
    >
      <Image source={{ uri: imageUri }} style={styles.cardImage} />
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      <View style={styles.userInfo}>
        {/* <Avatar uri={avatarUri} /> */}
        {/* <Text style={styles.userName}>{userName}</Text> */}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
    // 拟物细节：微弱阴影与高光
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  cardImage: {
    width: "100%",
    height: 145,
    backgroundColor: "#f5f5f7",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1c1c1e",
    paddingTop: 12,
    paddingHorizontal: 10,
    paddingBottom: 4,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 12,
    minHeight: 12,
  },
  userName: {
    fontSize: 12,
    color: "#8e8e93",
    marginLeft: 4,
  },
});

export default Card;
