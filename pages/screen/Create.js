import React from 'react';
import {View, StyleSheet, TextInput, Text} from 'react-native';
const UselessTextInput = props => {
  return (
    <TextInput
      {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
      editable
    />
  );
};
export const CreateScreen = ({navigation, route}) => {
  const [value, setValue] = React.useState('Useless Multiline Placeholder');
  const textChange = text => {
    console.log('text', text);
    setValue(text);
    const textArray = text.split('\n');
    textArray.map(eachLine => {
      console.log('eachLine', eachLine);
      const singleLineArray = eachLine.split(' ');
    });
  };
  return (
    <View>
      <UselessTextInput multiline onChangeText={textChange} value={value} />
      <Text>{value}</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
  },
});
