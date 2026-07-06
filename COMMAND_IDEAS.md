# 💡 50 Creative & Helpful Slack Commands for FridgeChef AI

This catalog documents **50 additional slash command ideas** for FridgeChef AI, organized into categories. These ideas can be used to expand the bot's features or serve as future development milestones for showcase projects.

---

## ❄️ Category 1: Inventory & Expiration Management (1-10)

1. **`/fridgeinventory list`**
   - *Description:* Lists all items currently stored in the user's digital fridge.
   - *Why helpful:* Avoids needing to look inside the physical fridge or re-type ingredients.

2. **`/fridgeinventory add [item1, item2]`**
   - *Description:* Adds multiple ingredients to the saved pantry list.
   - *Why helpful:* Keeps the list updated easily by appending items right after shopping.

3. **`/fridgeinventory remove [item]`**
   - *Description:* Deletes a specific item from the saved fridge list once it is consumed.
   - *Why helpful:* Keeps the inventory accurate and prevents outdated ingredient suggestions.

4. **`/fridgeinventory clear`**
   - *Description:* Clears all stored ingredients.
   - *Why helpful:* Ideal for resetting the fridge when moving out or eating all leftovers.

5. **`/fridgeexpire add [item] [YYYY-MM-DD]`**
   - *Description:* Registers an expiration date for a perishable item.
   - *Why helpful:* Allows the bot to notify users when food is about to go bad.

6. **`/fridgeexpire list`**
   - *Description:* Displays all saved items sorted by their expiration dates (soonest first).
   - *Why helpful:* Helps users plan meals around ingredients that need to be used immediately.

7. **`/fridgeexpire check`**
   - *Description:* Returns a list of items that are expiring within the next 48 hours.
   - *Why helpful:* Prevents food waste by highlighting items that need immediate attention.

8. **`/fridgefreeze [item]`**
   - *Description:* Marks an item as "frozen" rather than fresh, modifying its estimated shelf life.
   - *Why helpful:* Helps track what is in the freezer vs. the main refrigerator compartments.

9. **`/fridgeaudit`**
   - *Description:* Prompts the user with a list of items that have been in the inventory for over a week, asking if they have been eaten.
   - *Why helpful:* Keeps the virtual inventory clean and aligned with physical reality.

10. **`/fridgehistory`**
    - *Description:* Shows the most frequently logged ingredients in the user's fridge over time.
    - *Why helpful:* Helps users understand their grocery habits and purchase patterns.

---

## 🍳 Category 2: AI Recipe Generation & Customization (11-20)

11. **`/fridgecook [ingredients]`**
    - *Description:* Core recipe generator based on user input or saved inventory.
    - *Why helpful:* Solves the "what should I eat?" problem instantly.

12. **`/fridgecookquick`**
    - *Description:* Generates a recipe that takes less than 15 minutes to prep and cook.
    - *Why helpful:* Perfect for busy workdays or quick lunch breaks.

13. **`/fridgecookdiet [vegetarian/vegan/keto/gluten-free]`**
    - *Description:* Generates recipes complying strictly with the selected dietary restriction.
    - *Why helpful:* Ensures safe and targeted recipe suggestions for health-conscious users.

14. **`/fridgecookleftover`**
    - *Description:* Generates recipes specifically designed to combine odd combinations of leftovers (e.g. cold pasta, half a lemon, and lunch meat).
    - *Why helpful:* Encourages creative food-waste reduction.

15. **`/fridgecookbake`**
    - *Description:* Specifically generates dessert, bread, or baking recipes using current items.
    - *Why helpful:* Great for weekend baking projects using eggs, flour, sugar, and fruits.

16. **`/fridgecooksmoothie`**
    - *Description:* Recommends quick blender recipes using fruits, vegetables, dairy, or protein powders.
    - *Why helpful:* Excellent for post-workout snacks or quick breakfast drinks.

17. **`/fridgecookkid`**
    - *Description:* Suggests kid-friendly, fun, and colorful recipes using available ingredients.
    - *Why helpful:* Useful for busy parents trying to make meals appealing to children.

18. **`/fridgecookparty [number_of_guests]`**
    - *Description:* Suggests large-batch recipes or appetizer platters based on available food.
    - *Why helpful:* Eases cooking planning when hosting friends or family gatherings.

19. **`/fridgecookmicrowave`**
    - *Description:* Recommends mug meals or microwave-safe recipes.
    - *Why helpful:* Perfect for college students in dorms or workers in office kitchenettes.

20. **`/fridgecookairfry`**
    - *Description:* Generates recipes tailored specifically for air-fryer cooking.
    - *Why helpful:* Quick, crispy meals using minimal oil.

---

## 🥗 Category 3: Diet, Health & Nutrition (21-30)

21. **`/fridgehealth [meal/ingredients]`**
    - *Description:* Analyzes the macronutrients and returns a health score out of 10.
    - *Why helpful:* Increases nutritional awareness.

22. **`/fridgehealthtrack [calories]`**
    - *Description:* Logs daily calorie intake and tracks progress towards a goal.
    - *Why helpful:* Promotes weight management directly inside the chat interface.

23. **`/fridgehealthmacro [target_protein/target_carbs/target_fats]`**
    - *Description:* Sets target macros and suggests recipes that fit the user's daily goals.
    - *Why helpful:* Assists fitness enthusiasts and bodybuilders in hitting macro targets.

24. **`/fridgehealthwater [amount_ml]`**
    - *Description:* Logs water intake and shows a progress bar towards the daily goal (e.g. 2L).
    - *Why helpful:* Promotes hydration during long working hours.

25. **`/fridgehealthsub [ingredient]`**
    - *Description:* Recommends healthier alternatives for high-calorie ingredients (e.g. Greek yogurt instead of sour cream).
    - *Why helpful:* Helps users cook lighter versions of their favorite meals.

26. **`/fridgehealthallergy [peanut/dairy/soy]`**
    - *Description:* Sets user allergen profiles, automatically filtering out unsafe recipes.
    - *Why helpful:* Critical for safety in shared house environments.

27. **`/fridgehealthscore`**
    - *Description:* Compiles a weekly report card showing how balanced the user's meals have been.
    - *Why helpful:* Encourages long-term healthy eating habits.

28. **`/fridgehealthvitamins`**
    - *Description:* Analyzes the inventory and identifies which vitamins (A, B, C, D) are lacking, recommending foods to buy.
    - *Why helpful:* Helps prevent micronutrient deficiencies.

29. **`/fridgehealthdetox`**
    - *Description:* Suggests antioxidant-rich, anti-inflammatory meals based on what is in the fridge.
    - *Why helpful:* Great for recovering from holiday overeating or illnesses.

30. **`/fridgehealthcarb`**
    - *Description:* Specifically flags low-carb, diabetic-friendly meals.
    - *Why helpful:* Crucial for managing blood sugar and insulin levels.

---

## 🛒 Category 4: Shopping & Smart Budgeting (31-40)

31. **`/fridgeshop [ingredients]`**
    - *Description:* Compiles a shopping list for missing ingredients with interactive checkboxes.
    - *Why helpful:* Keeps grocery shopping organized and collaborative.

32. **`/fridgeshopbudget [max_amount_usd]`**
    - *Description:* Creates a shopping list that strictly stays under a specified budget.
    - *Why helpful:* Helps students and families manage food costs.

33. **`/fridgeshopstore [store_name]`**
    - *Description:* Sorts the shopping list by typical store aisles (Produce, Dairy, Meat, Pantry).
    - *Why helpful:* Saves time when navigating the supermarket.

34. **`/fridgeshopsave [item]`**
    - *Description:* Tracks prices of items over time and alerts users of price drops.
    - *Why helpful:* Optimizes grocery budgets.

35. **`/fridgeshophistory`**
    - *Description:* Shows past shopping lists and estimated total costs.
    - *Why helpful:* Simplifies budget forecasting for household groups.

36. **`/fridgeshopshare`**
    - *Description:* Shares the current shopping checklist with another roommate.
    - *Why helpful:* Prevents duplicate purchases (e.g. buying milk twice).

37. **`/fridgeshopbrands`**
    - *Description:* Compares prices between generic store brands and premium name brands.
    - *Why helpful:* Offers easy saving opportunities.

38. **`/fridgeshopcoupon`**
    - *Description:* Queries web APIs for active digital coupons or deals matching items on the list.
    - *Why helpful:* Lowers checkout totals.

39. **`/fridgeshopmeals [meal_names]`**
    - *Description:* Generates a grocery list specifically needed to cook 3-5 specific meals.
    - *Why helpful:* Simplifies weekly meal prepping.

40. **`/fridgeshoponline`**
    - *Description:* Formats the shopping list into links ready to copy-paste into online delivery carts.
    - *Why helpful:* Speeds up online grocery orders.

---

## 📢 Category 5: Social Sharing & Community (41-50)

41. **`/fridgeshare [description]`**
    - *Description:* Posts a public food share alert in the channel with a claim button.
    - *Why helpful:* Promotes sustainability and community sharing.

42. **`/fridgeshareclaims`**
    - *Description:* Lists all food items claimed by the current user or shared by them.
    - *Why helpful:* Keeps track of sharing history.

43. **`/fridgeshareleaderboard`**
    - *Description:* Shows a fun leaderboard of room members who shared the most food.
    - *Why helpful:* Gamifies food-waste prevention.

44. **`/fridgesharedinner`**
    - *Description:* Proposes a potluck recipe combining items from multiple users' inventories.
    - *Why helpful:* Promotes social dinners and roommate bonding.

45. **`/fridgetips [topic]`**
    - *Description:* Provides AI hacks on food storage, preservation, and knife skills.
    - *Why helpful:* Teaches users how to extend the life of their ingredients.

46. **`/fridgecookoff [ingredient]`**
    - *Description:* Launches a channel cooking contest challenging members to make the best dish using a specific ingredient.
    - *Why helpful:* Boosts workspace/community engagement.

47. **`/fridgeask [question]`**
    - *Description:* Let users ask general culinary questions (e.g. "can I substitute butter for coconut oil in brownies?").
    - *Why helpful:* Acts as an interactive kitchen advisor.

48. **`/fridgepoll`**
    - *Description:* Launches a channel vote on what the group should cook for dinner tonight.
    - *Why helpful:* Facilitates group decision-making.

49. **`/fridgegift [user] [item]`**
    - *Description:* Transfres a specific inventory item to a roommate's virtual inventory.
    - *Why helpful:* Helps maintain accurate tracking when sharing groceries.

50. **`/fridgebadge`**
    - *Description:* Displays achievements unlocked by the user (e.g., "Waste Reducer", "Keto Master").
    - *Why helpful:* Increases engagement and gamifies sustainability.
