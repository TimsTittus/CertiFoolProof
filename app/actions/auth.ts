"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@/lib/enums"

export interface SignupInput {
    name: string
    email: string
    password: string
    role: UserRole
    rolePassword: string
}

export interface SignupResult {
    success: boolean
    error?: string
}

// Map roles to their environment variable passwords
const rolePasswordMap: Record<UserRole, string | undefined> = {
    [UserRole.ADMIN]: process.env.ADMIN_PASSWORD,
    [UserRole.FACULTY]: process.env.FACULTY_PASSWORD,
    [UserRole.CLUB]: process.env.CLUB_PASSWORD,
}

export async function signupUser(input: SignupInput): Promise<SignupResult> {
    try {
        // Validate input
        if (!input.name?.trim()) {
            return { success: false, error: "Full name is required" }
        }
        if (!input.email?.trim()) {
            return { success: false, error: "Email is required" }
        }
        if (!input.password || input.password.length < 6) {
            return { success: false, error: "Password must be at least 6 characters" }
        }
        if (!input.role || !Object.values(UserRole).includes(input.role)) {
            return { success: false, error: "Please select a valid role" }
        }
        if (!input.rolePassword) {
            return { success: false, error: "Role secret key is required" }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(input.email)) {
            return { success: false, error: "Invalid email format" }
        }

        // Validate role password against environment variable
        const expectedPassword = rolePasswordMap[input.role]
        if (!expectedPassword) {
            return { success: false, error: "Role registration is not configured. Contact your administrator." }
        }
        if (input.rolePassword !== expectedPassword) {
            return { success: false, error: "Invalid role secret key" }
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email.trim().toLowerCase() },
        })
        if (existingUser) {
            return { success: false, error: "An account with this email already exists" }
        }

        // Hash the user's personal password
        const hashedPassword = await bcrypt.hash(input.password, 12)

        // Create the user
        await prisma.user.create({
            data: {
                email: input.email.trim().toLowerCase(),
                name: input.name.trim(),
                password: hashedPassword,
                role: input.role,
            },
        })

        return { success: true }
    } catch (error) {
        console.error("[SIGNUP] Error:", error)
        return { success: false, error: "Something went wrong. Please try again." }
    }
}
