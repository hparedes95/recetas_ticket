import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Inicio: undefined;
  Despensa: undefined;
  Planes: undefined;
  Compra: undefined;
  Ajustes: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  AddTicket: undefined;
  ShoppingMode: undefined;
  PlanDetail: { planId: string };
  RecipeDetail: { recipeId: string };
  Tastes: { profileId: string } | undefined;
  Household: undefined;
  ProfileEdit: { profileId: string };
  FamilySync: undefined;
};
