"use server"

import { auth } from "@/auth"
import { headers } from "next/headers"
import { db } from "@/db"
import { user as userTable, account as accountTable } from "@/db/schema"
import { hashPassword } from "better-auth/crypto"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

async function requireAdmin() {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    if (!session?.user || session.user.role !== "ADMIN") {
        throw new Error("Unauthorized")
    }
    return session.user
}

export interface CreateUserInput {
    name: string
    email: string
    password: string
    role: "FACULTY" | "CLUB"
    department?: string
    phone?: string
}

export interface CreateUserResult {
    success: boolean
    error?: string
}

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
    try {
        const admin = await requireAdmin()

        if (!input.name?.trim()) return { success: false, error: "Name is required" }
        if (!input.email?.trim()) return { success: false, error: "Email is required" }
        if (!input.password || input.password.length < 6) return { success: false, error: "Password must be at least 6 characters" }
        if (!["FACULTY", "CLUB"].includes(input.role)) return { success: false, error: "Role must be FACULTY or CLUB" }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input.email)) return { success: false, error: "Invalid email format" }

        const phone = input.phone?.trim()
        if (phone) {
            const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/
            if (!phoneRegex.test(phone)) {
                return { success: false, error: "Invalid phone number format" }
            }
        }

        const existing = await db.query.user.findFirst({
            where: eq(userTable.email, input.email.trim().toLowerCase())
        })
        if (existing) return { success: false, error: "A user with this email already exists" }

        const userId = crypto.randomUUID()
        const hashedPassword = await hashPassword(input.password)

        await db.transaction(async (tx) => {
            await tx.insert(userTable).values({
                id: userId,
                name: input.name.trim(),
                email: input.email.trim().toLowerCase(),
                password: hashedPassword,
                role: input.role,
                department: input.department?.trim() || null,
                phone: phone || "0000000000",
            })

            await tx.insert(accountTable).values({
                id: crypto.randomUUID(),
                accountId: userId,
                providerId: "credential",
                userId,
                password: hashedPassword,
            })
        })

        console.log(`[ADMIN] ${admin.email} created user: ${input.email} (${input.role})`)
        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return { success: false, error: "Unauthorized" }
        }
        console.error("Create user error:", error)
        return { success: false, error: "Failed to create user" }
    }
}

export async function deleteUser(userId: string): Promise<CreateUserResult> {
    try {
        const admin = await requireAdmin()

        const user = await db.query.user.findFirst({
            where: eq(userTable.id, userId),
            with: {
                certificates: {
                    columns: {
                        id: true
                    }
                }
            }
        })

        if (!user) return { success: false, error: "User not found" }
        if (user.role === "ADMIN") return { success: false, error: "Cannot delete admin accounts" }
        if (user.certificates.length > 0) {
            return { success: false, error: `Cannot delete: user has ${user.certificates.length} issued certificate(s). Reassign or remove them first.` }
        }

        await db.delete(userTable).where(eq(userTable.id, userId))

        console.log(`[ADMIN] ${admin.email} deleted user: ${user.email}`)
        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return { success: false, error: "Unauthorized" }
        }
        console.error("Delete user error:", error)
        return { success: false, error: "Failed to delete user" }
    }
}

export async function updateUserRole(userId: string, newRole: "FACULTY" | "CLUB"): Promise<CreateUserResult> {
    try {
        const admin = await requireAdmin()

        const user = await db.query.user.findFirst({ where: eq(userTable.id, userId) })
        if (!user) return { success: false, error: "User not found" }
        if (user.role === "ADMIN") return { success: false, error: "Cannot change admin role" }
        if (!["FACULTY", "CLUB"].includes(newRole)) return { success: false, error: "Invalid role" }

        await db.update(userTable)
            .set({ role: newRole })
            .where(eq(userTable.id, userId))

        console.log(`[ADMIN] ${admin.email} changed ${user.email} role: ${user.role} → ${newRole}`)
        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        if (error instanceof Error && error.message === "Unauthorized") {
            return { success: false, error: "Unauthorized" }
        }
        console.error("Update role error:", error)
        return { success: false, error: "Failed to update role" }
    }
}