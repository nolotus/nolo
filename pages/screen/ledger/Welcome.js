import React, {useState} from 'react';
import {Button, View, Text} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
export const Welcome = () => {
  const [accounts, setAccounts] = useState();
  const recentFlow = [1, 2, 3];
  const HomeScreen = ({navigation}) => {
    return (
      <View>
        <Text>开始记账</Text>
        {accounts ? (
          <Text>有</Text>
        ) : (
          <Button
            title="请新建账户"
            onPress={() => navigation.navigate('CreateAccount')}
          />
        )}
        {recentFlow.map(item => {
          return <Text key={item}>{item}</Text>;
        })}
      </View>
    );
  };
  const createAccountScreen = () => {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <Text>Details Screen</Text>
      </View>
    );
  };
  const Stack = createStackNavigator();

  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CreateAccount" component={createAccountScreen} />
    </Stack.Navigator>
  );
};
