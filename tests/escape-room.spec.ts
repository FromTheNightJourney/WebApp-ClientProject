import { test, expect } from '@playwright/test';

// test1 (verify everything loads)
test('should load the escape room builder correctly', async ({ page }) => {
  await page.goto('http://localhost:3000/escape-room');

  // fully load page, check title, default is builder, and puzzle is empty
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Escape Room Builder')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Builder', exact: true })).toBeVisible();
  await expect(page.getByText('No puzzles yet')).toBeVisible({ timeout: 10000 });
});

// test2 (make new puzzle)
test('should create a puzzle successfully', async ({ page }) => {
  await page.goto('http://localhost:3000/escape-room');

  //load page, wait, fill form, clear text
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Create New Puzzle' })).toBeVisible({ timeout: 10000 });
  const questionInput = page.getByPlaceholder('Enter your puzzle question...');
  await questionInput.click();
  await questionInput.fill('');
  await questionInput.fill('What data type does print("Hello World") output?');
  await page.waitForTimeout(500);
  
  // altcheck
  const questionValue = await questionInput.inputValue();
  expect(questionValue).toBe('What data type does print("Hello World") output?');

  const answerInput = page.getByPlaceholder('Answer...');
  await answerInput.click();
  await answerInput.fill('');
  await answerInput.fill('String');
  
  await page.waitForTimeout(500);
  const answerValue = await answerInput.inputValue();
  expect(answerValue).toBe('String');
  await page.getByRole('button', { name: 'Create Puzzle' }).click();
  await page.waitForSelector('text=No puzzles yet', { state: 'hidden', timeout: 10000 }).catch(() => {
  });

  await expect(page.getByText('What data type does print("Hello World") output?')).toBeVisible({ timeout: 15000 });
  
  await expect(page.getByRole('button', { name: /Puzzles \(\d+\)/ })).toContainText('Puzzles (1)', { timeout: 10000 });
});