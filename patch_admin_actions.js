const fs = require('fs');
let content = fs.readFileSync('src/app/admin/actions.ts', 'utf8');

// Ensure revalidatePath is imported
if (!content.includes('import { revalidatePath }')) {
  content = content.replace('import { supabase } from "@/utils/supabase";', 'import { supabase } from "@/utils/supabase";\nimport { revalidatePath } from "next/cache";');
}

// Add revalidatePath('/') to addGenre
content = content.replace(
  '  if (error) return { success: false, error: error.message };\n  return { success: true, data };',
  '  if (error) return { success: false, error: error.message };\n  revalidatePath(\'/\');\n  return { success: true, data };'
);

// Add revalidatePath('/') to swapGenreOrder
content = content.replace(
  '  if (err1 || err2) return { success: false };\n  \n  return { success: true };',
  '  if (err1 || err2) return { success: false };\n  revalidatePath(\'/\');\n  return { success: true };'
);

// Add revalidatePath('/') to deleteGenre
content = content.replace(
  '  if (error) return { success: false, error: error.message };\n  return { success: true };',
  '  if (error) return { success: false, error: error.message };\n  revalidatePath(\'/\');\n  return { success: true };'
);

// Add revalidatePath('/') to updateGenreAction
content = content.replace(
  '    }\n    return { success: true };\n  } catch (error: any) {',
  '    }\n    revalidatePath(\'/\');\n    return { success: true };\n  } catch (error: any) {'
);

// Add revalidatePath('/') to reorderGenresAction
content = content.replace(
  '      }\n    }\n    return { success: true };\n  } catch (error: any) {',
  '      }\n    }\n    revalidatePath(\'/\');\n    return { success: true };\n  } catch (error: any) {'
);

fs.writeFileSync('src/app/admin/actions.ts', content);
